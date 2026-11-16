use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use reqwest::{
    blocking::{Client, RequestBuilder},
    StatusCode,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{BufRead, BufReader, Read, Write},
    net::{Ipv4Addr, TcpListener, TcpStream},
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::Url;
use trackdraw_desktop::assets::digest;

const CLIENT_ID: &str = "trackdraw-desktop";
const RESOURCE: &str = "https://trackdraw.app/api/desktop/session";
const SCOPE: &str = "desktop:account offline_access";
const CALLBACK: &str = "/callback";
type Result<T> = std::result::Result<T, &'static str>;

#[derive(Clone)]
pub struct DesktopLogin {
    origin: Url,
    key: String,
    busy: Arc<Mutex<()>>,
    cancelled: Arc<AtomicBool>,
}

#[derive(Deserialize, Serialize)]
pub struct Account {
    id: String,
    name: Option<String>,
    email: Option<String>,
}

#[derive(Deserialize, Serialize)]
struct Credential {
    account: Account,
    refresh_token: String,
}

#[derive(Deserialize)]
struct Tokens {
    access_token: String,
    refresh_token: String,
}

#[derive(Deserialize)]
struct Session {
    account: Account,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum AccountStatus {
    SignedOut,
    SignedOutOffline,
    Connected { account: Account },
    Offline { account: Account },
}

impl DesktopLogin {
    pub fn new(profile: &Path) -> Self {
        let origin = Url::parse("https://trackdraw.app").expect("valid TrackDraw origin");
        #[cfg(debug_assertions)]
        let origin = match std::env::var("TRACKDRAW_DESKTOP_AUTH_ORIGIN").as_deref() {
            Ok("http://localhost:8787") => Url::parse("http://localhost:8787").unwrap(),
            _ => origin,
        };
        let key = digest(format!("{}:{}", origin, profile.display()));
        Self {
            origin,
            key,
            busy: Arc::new(Mutex::new(())),
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    fn url(&self, path: &str) -> Url {
        self.origin.join(path).expect("fixed desktop auth path")
    }

    fn http(&self) -> Result<Client> {
        let builder = Client::builder()
            .timeout(Duration::from_secs(8))
            .redirect(reqwest::redirect::Policy::none());
        let builder = if self.origin.scheme() == "http" {
            builder.no_proxy()
        } else {
            builder
        };
        builder.build().map_err(|_| "unavailable")
    }

    fn entry(&self) -> Result<keyring::Entry> {
        keyring::Entry::new("app.trackdraw.desktop.alpha", &self.key).map_err(|_| "keychain")
    }

    fn load(&self) -> Result<Option<Credential>> {
        match self.entry()?.get_password() {
            Ok(value) => serde_json::from_str(&value)
                .map(Some)
                .map_err(|_| "keychain"),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("keychain"),
        }
    }

    fn store(&self, credential: &Credential) -> Result<()> {
        let value = serde_json::to_string(credential).map_err(|_| "keychain")?;
        self.entry()?.set_password(&value).map_err(|_| "keychain")
    }

    fn clear(&self) -> Result<()> {
        match self.entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("keychain"),
        }
    }

    fn token_request(&self, http: &Client, grant: &[(&str, &str)]) -> RequestBuilder {
        let mut form = vec![("client_id", CLIENT_ID), ("resource", RESOURCE)];
        form.extend_from_slice(grant);
        http.post(self.url("/api/auth/oauth2/token")).form(&form)
    }

    fn exchange(&self, http: &Client, grant: &[(&str, &str)]) -> Result<Tokens> {
        let response = self
            .token_request(http, grant)
            .send()
            .map_err(|_| "unavailable")?;
        match response.status() {
            StatusCode::OK => response.json().map_err(|_| "unavailable"),
            StatusCode::BAD_REQUEST | StatusCode::UNAUTHORIZED => Err("rejected"),
            _ => Err("unavailable"),
        }
    }

    fn account(&self, http: &Client, access_token: &str) -> Result<Account> {
        let response = http
            .get(self.url("/api/desktop/session"))
            .bearer_auth(access_token)
            .send()
            .map_err(|_| "unavailable")?;
        match response.status() {
            StatusCode::OK => response
                .json::<Session>()
                .map(|session| session.account)
                .map_err(|_| "unavailable"),
            StatusCode::UNAUTHORIZED => Err("rejected"),
            _ => Err("unavailable"),
        }
    }

    fn revoke(&self, http: &Client, refresh_token: &str) -> bool {
        http.post(self.url("/api/auth/oauth2/revoke"))
            .form(&[
                ("client_id", CLIENT_ID),
                ("token", refresh_token),
                ("token_type_hint", "refresh_token"),
            ])
            .send()
            .is_ok_and(|response| response.status().is_success())
    }

    pub fn restore(&self) -> Result<AccountStatus> {
        let _guard = self.busy.try_lock().map_err(|_| "busy")?;
        let Some(mut credential) = self.load()? else {
            return Ok(AccountStatus::SignedOut);
        };
        let http = self.http()?;
        let restored = self
            .exchange(
                &http,
                &[
                    ("grant_type", "refresh_token"),
                    ("refresh_token", &credential.refresh_token),
                ],
            )
            .and_then(|tokens| {
                credential.refresh_token = tokens.refresh_token;
                // Persist the rotated token even if the identity request fails.
                self.store(&credential)?;
                self.account(&http, &tokens.access_token)
            });
        match restored {
            Ok(account) if credential.account.id == account.id => {
                credential.account = account;
                self.store(&credential)?;
                Ok(AccountStatus::Connected {
                    account: credential.account,
                })
            }
            Ok(_) | Err("rejected") => {
                self.clear()?;
                Ok(AccountStatus::SignedOut)
            }
            Err("unavailable") => Ok(AccountStatus::Offline {
                account: credential.account,
            }),
            Err(error) => Err(error),
        }
    }

    pub fn sign_out(&self) -> Result<AccountStatus> {
        let _guard = self.busy.try_lock().map_err(|_| "busy")?;
        let credential = self.load()?;
        self.clear()?;
        Ok(match credential {
            Some(credential)
                if !self
                    .http()
                    .is_ok_and(|http| self.revoke(&http, &credential.refresh_token)) =>
            {
                AccountStatus::SignedOutOffline
            }
            _ => AccountStatus::SignedOut,
        })
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Release);
    }

    pub fn sign_in(&self) -> Result<AccountStatus> {
        let _guard = self.busy.try_lock().map_err(|_| "busy")?;
        self.cancelled.store(false, Ordering::Release);
        if self.load()?.is_some() {
            return Err("alreadyConnected");
        }

        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).map_err(|_| "unavailable")?;
        listener.set_nonblocking(true).map_err(|_| "unavailable")?;
        let port = listener.local_addr().map_err(|_| "unavailable")?.port();
        let redirect_uri = format!("http://127.0.0.1:{port}{CALLBACK}");
        let verifier = nonce()?;
        let state = nonce()?;
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
        let issuer = self.url("/api/auth");
        let mut authorize = self.url("/api/auth/oauth2/authorize");
        authorize.query_pairs_mut().extend_pairs([
            ("client_id", CLIENT_ID),
            ("response_type", "code"),
            ("prompt", "consent"),
            ("redirect_uri", &redirect_uri),
            ("scope", SCOPE),
            ("resource", RESOURCE),
            ("state", &state),
            ("code_challenge_method", "S256"),
            ("code_challenge", &challenge),
        ]);
        open::that_detached(authorize.as_str()).map_err(|_| "browser")?;
        let http = self.http()?;
        let deadline = Instant::now() + Duration::from_secs(180);
        while Instant::now() < deadline {
            if self.cancelled.load(Ordering::Acquire) {
                return Err("cancelled");
            }
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let mut line = String::new();
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
                    let _ = stream.set_write_timeout(Some(Duration::from_secs(1)));
                    let read = BufReader::new((&stream).take(8192)).read_line(&mut line);
                    let Some(callback) = read
                        .ok()
                        .filter(|&count| count < 8192)
                        .and_then(|_| parse_callback(&line, &state, issuer.as_str()))
                    else {
                        reply(&mut stream, false);
                        continue;
                    };
                    let result = callback
                        .ok_or("cancelled")
                        .and_then(|code| {
                            self.exchange(
                                &http,
                                &[
                                    ("grant_type", "authorization_code"),
                                    ("redirect_uri", &redirect_uri),
                                    ("code", &code),
                                    ("code_verifier", &verifier),
                                ],
                            )
                        })
                        .and_then(|tokens| {
                            let result =
                                self.account(&http, &tokens.access_token)
                                    .and_then(|account| {
                                        if self.cancelled.load(Ordering::Acquire) {
                                            return Err("cancelled");
                                        }
                                        let credential = Credential {
                                            account,
                                            refresh_token: tokens.refresh_token.clone(),
                                        };
                                        self.store(&credential)?;
                                        Ok(AccountStatus::Connected {
                                            account: credential.account,
                                        })
                                    });
                            if result.is_err() {
                                self.revoke(&http, &tokens.refresh_token);
                            }
                            result
                        });
                    reply(&mut stream, result.is_ok());
                    return result;
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => return Err("unavailable"),
            }
        }
        Err("timeout")
    }
}

fn nonce() -> Result<String> {
    let mut bytes = [0; 32];
    getrandom::fill(&mut bytes).map_err(|_| "unavailable")?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

// An outer None is an unrelated request. An inner None is a verified denial.
fn parse_callback(line: &str, state: &str, issuer: &str) -> Option<Option<String>> {
    let mut fields = line.split_ascii_whitespace();
    if fields.next()? != "GET" {
        return None;
    }
    let target = fields.next()?;
    let (path, query) = target.split_once('?')?;
    if path != CALLBACK || !matches!(fields.next(), Some("HTTP/1.1" | "HTTP/1.0")) {
        return None;
    }
    let url = Url::parse(&format!("http://127.0.0.1{CALLBACK}?{query}")).ok()?;
    let one = |key: &str| {
        let mut values = url.query_pairs().filter(move |(name, _)| name == key);
        let value = values.next()?.1.into_owned();
        values.next().is_none().then_some(value)
    };
    if one("state")?.as_str() != state || one("iss")?.as_str() != issuer {
        return None;
    }
    match (one("code"), one("error")) {
        (Some(code), None) if !code.is_empty() => Some(Some(code)),
        (None, Some(_)) => Some(None),
        _ => None,
    }
}

fn reply(stream: &mut TcpStream, success: bool) {
    let text = if success {
        "TrackDraw Desktop is connected. You can close this tab."
    } else {
        "TrackDraw Desktop could not connect. Return to the app to try again."
    };
    let status = if success { "200 OK" } else { "400 Bad Request" };
    let _ = write!(
        stream,
        "HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{text}",
        text.len()
    );
}

#[cfg(test)]
mod tests {
    use super::{parse_callback, DesktopLogin, CLIENT_ID, RESOURCE};
    use std::path::Path;

    #[test]
    fn includes_the_client_and_resource_in_the_token_form() {
        let login = DesktopLogin::new(Path::new("test-profile"));
        let http = login.http().unwrap();
        let request = login
            .token_request(
                &http,
                &[("grant_type", "authorization_code"), ("code", "test-code")],
            )
            .build()
            .unwrap();
        let body = std::str::from_utf8(request.body().unwrap().as_bytes().unwrap()).unwrap();
        let form = tauri::Url::parse(&format!("https://example.invalid/?{body}")).unwrap();
        assert_eq!(
            form.query_pairs().collect::<Vec<_>>(),
            [
                ("client_id".into(), CLIENT_ID.into()),
                ("resource".into(), RESOURCE.into()),
                ("grant_type".into(), "authorization_code".into()),
                ("code".into(), "test-code".into()),
            ]
        );
    }

    #[test]
    fn accepts_only_the_matching_state_issuer_and_callback() {
        let issuer = "https://trackdraw.app/api/auth";
        let query = "state=local&iss=https%3A%2F%2Ftrackdraw.app%2Fapi%2Fauth";
        let callback = |url| parse_callback(&format!("GET {url} HTTP/1.1"), "local", issuer);
        assert_eq!(
            callback(format!("/callback?{query}&code=one")),
            Some(Some("one".into()))
        );
        assert_eq!(
            callback(format!("/callback?{query}&error=access_denied")),
            Some(None)
        );
        assert_eq!(
            callback(format!("/callback?{query}&state=other&code=one")),
            None
        );
        assert_eq!(callback(format!("/other?{query}&code=one")), None);
        assert_eq!(
            callback("/callback?state=local&iss=https://other.test/api/auth&code=one".into()),
            None
        );
    }
}
