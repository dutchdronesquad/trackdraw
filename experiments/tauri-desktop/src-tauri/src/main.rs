#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;
use trackdraw_desktop::{
    assets::verify_embedded,
    files::{import_legacy_database, read_project, validate_project_text, write_backup},
    repository::Repository,
};

struct DesktopState {
    repository: Mutex<Repository>,
    approved_close: AtomicBool,
    quitting: AtomicBool,
    profile: PathBuf,
}
fn trusted(window: &WebviewWindow) -> Result<(), String> {
    if window.label() != "main" || !local_url(&window.url().map_err(|e| e.to_string())?) {
        return Err("Untrusted desktop request".into());
    }
    Ok(())
}
fn local_url(url: &tauri::Url) -> bool {
    ((url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost")))
        && matches!(url.path(), "" | "/" | "/index.html" | "/studio")
}

#[cfg(test)]
mod navigation_tests {
    use super::local_url;
    #[test]
    fn allows_local_startup_and_editor_but_refuses_remote_and_account_routes() {
        for url in [
            "tauri://localhost",
            "tauri://localhost/index.html",
            "tauri://localhost/studio?view=3d&dialog=export",
            "http://tauri.localhost/studio",
            "https://tauri.localhost/",
        ] {
            assert!(local_url(&tauri::Url::parse(url).unwrap()), "{url}");
        }
        for url in [
            "https://trackdraw.app/studio",
            "https://example.com/",
            "tauri://localhost/login",
            "tauri://other/studio",
            "file:///index.html",
            "about:blank",
        ] {
            assert!(!local_url(&tauri::Url::parse(url).unwrap()), "{url}");
        }
    }
}
#[tauri::command]
fn desktop_platform(window: WebviewWindow) -> Result<&'static str, String> {
    trusted(&window)?;
    Ok(match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    })
}

#[tauri::command]
async fn desktop_projects(
    window: WebviewWindow,
    name: String,
    payload: Value,
) -> Result<Value, String> {
    trusted(&window)?;
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<DesktopState>()
            .repository
            .lock()
            .map_err(|_| "Project storage is unavailable".to_string())?
            .command(&name, &payload)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn finish_close(window: WebviewWindow, state: State<'_, DesktopState>) -> Result<(), String> {
    trusted(&window)?;
    state.approved_close.store(true, Ordering::SeqCst);
    window.close().map_err(|e| e.to_string())?;
    if state.quitting.load(Ordering::SeqCst) {
        window.app_handle().exit(0);
    }
    Ok(())
}
#[tauri::command]
async fn open_project(window: WebviewWindow) -> Result<Option<Value>, String> {
    trusted(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = window.app_handle().dialog().file().set_parent(&window).set_title("Open a TrackDraw project copy").add_filter("TrackDraw project", &["json"]).blocking_pick_file() else { return Ok(None); };
        let path = file.into_path().map_err(|e| e.to_string())?;
        Ok(Some(serde_json::json!({"name":path.file_name().unwrap_or_default().to_string_lossy(),"text":read_project(&path)?})))
    }).await.map_err(|e| e.to_string())?
}
#[derive(Deserialize)]
struct ProjectSave {
    text: String,
    name: String,
}
#[tauri::command]
async fn save_project(
    window: WebviewWindow,
    payload: ProjectSave,
) -> Result<Option<String>, String> {
    trusted(&window)?;
    validate_project_text(&payload.text)?;
    tauri::async_runtime::spawn_blocking(move || {
        let safe: String = payload
            .name
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || " _-".contains(*c))
            .take(100)
            .collect();
        let name = format!("{}.json", if safe.is_empty() { "track" } else { &safe });
        let Some(file) = window
            .app_handle()
            .dialog()
            .file()
            .set_parent(&window)
            .set_title("Save a TrackDraw project copy")
            .add_filter("TrackDraw project", &["json"])
            .set_file_name(name)
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        write_backup(&path, payload.text.as_bytes())?;
        Ok(Some(
            path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[derive(Deserialize)]
struct ExportSave {
    bytes: Vec<u8>,
    name: String,
}
#[tauri::command]
async fn save_export(window: WebviewWindow, payload: ExportSave) -> Result<Option<String>, String> {
    trusted(&window)?;
    if payload.bytes.len() > 128 * 1024 * 1024 {
        return Err("Export exceeds the 128 MiB desktop limit.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let name: String = payload
            .name
            .chars()
            .filter(|c| !c.is_control() && !"/\\:".contains(*c))
            .take(180)
            .collect();
        let Some(file) = window
            .app_handle()
            .dialog()
            .file()
            .set_parent(&window)
            .set_title("Export from TrackDraw Desktop Alpha")
            .set_file_name(if name.is_empty() {
                "trackdraw-export"
            } else {
                &name
            })
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        write_backup(&path, &payload.bytes)?;
        Ok(Some(
            path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}
fn create_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let state = app.state::<DesktopState>();
    state.approved_close.store(false, Ordering::SeqCst);
    state.quitting.store(false, Ordering::SeqCst);
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("TrackDraw Desktop Alpha")
        .inner_size(1440.0, 960.0)
        .min_inner_size(960.0, 640.0);
    #[cfg(target_os = "macos")]
    let window = window
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(tauri::LogicalPosition::new(16.0, 15.0));
    window
        .data_directory(state.profile.join("webview"))
        .on_navigation(|url| {
            let allowed = local_url(url);
            #[cfg(debug_assertions)]
            if !allowed {
                eprintln!("Blocked desktop navigation: {url}");
            }
            allowed
        })
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .on_permission_request(|_, _| tauri::webview::PermissionResponse::Deny)
        .on_download(|_, _| false)
        .build()?;
    Ok(())
}
fn menus(app: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
    let menu = Menu::default(app)?;
    for (index, item) in menu.items()?.iter().enumerate() {
        if let MenuItemKind::Submenu(submenu) = item {
            if submenu.text()? == "File" {
                menu.remove_at(index)?;
                break;
            }
        }
    }
    let file = Submenu::new(app, "File", true)?;
    for (id, label, key) in [
        ("new", "New track", "CmdOrCtrl+N"),
        ("home", "Project library", "CmdOrCtrl+Shift+H"),
        ("open", "Open project copy…", "CmdOrCtrl+O"),
        ("save", "Save project copy as…", "CmdOrCtrl+Shift+S"),
        ("close-tab", "Close document", "CmdOrCtrl+W"),
        ("close-window", "Close window", "CmdOrCtrl+Shift+W"),
    ] {
        file.append(&MenuItem::with_id(app, id, label, true, Some(key))?)?;
    }
    #[cfg(not(target_os = "macos"))]
    file.append(&PredefinedMenuItem::quit(app, None)?)?;
    #[cfg(target_os = "macos")]
    let _ = std::marker::PhantomData::<PredefinedMenuItem<tauri::Wry>>;
    menu.insert(&file, if cfg!(target_os = "macos") { 1 } else { 0 })?;
    app.set_menu(menu)?;
    Ok(())
}
fn legacy_directory() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    let root = dirs::data_dir();
    #[cfg(not(target_os = "macos"))]
    let root = dirs::config_dir();
    root.map(|path| path.join("TrackDraw Desktop Alpha"))
}
fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            desktop_projects,
            desktop_platform,
            finish_close,
            open_project,
            save_project,
            save_export
        ])
        .setup(|app| {
            let profile_override = std::env::var_os("TRACKDRAW_DESKTOP_PROFILE");
            let profile = profile_override
                .as_ref()
                .map(PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?);
            std::fs::create_dir_all(&profile)?;
            let database = profile.join("projects.sqlite");
            if profile_override.is_none() {
                if let Some(legacy) = legacy_directory() {
                    import_legacy_database(&legacy.join("projects.sqlite"), &database)
                        .map_err(std::io::Error::other)?;
                }
            }
            // The resolver decompresses embedded bytes. The generated HTML is
            // excluded from the manifest because Tauri injects its IPC/CSP.
            let resolver = app.asset_resolver();
            let manifest = resolver
                .get("offline-manifest.json".into())
                .and_then(|asset| serde_json::from_slice::<Value>(&asset.bytes).ok())
                .ok_or_else(|| {
                    std::io::Error::other("The bundled asset manifest is missing or invalid")
                })?;
            verify_embedded(&manifest, |path| {
                resolver.get(path.into()).map(|asset| asset.bytes)
            })
            .map_err(std::io::Error::other)?;
            let repository =
                Repository::open(&database, Some(manifest)).map_err(std::io::Error::other)?;
            app.manage(DesktopState {
                repository: Mutex::new(repository),
                approved_close: AtomicBool::new(false),
                quitting: AtomicBool::new(false),
                profile,
            });
            menus(app.handle())?;
            create_window(app.handle())?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let Some(window) = app.get_webview_window("main") else {
                return;
            };
            match event.id().as_ref() {
                "new" | "home" | "open" | "save" | "close-tab" => {
                    let _ = window.emit("desktop:menu", event.id().as_ref());
                }
                "close-window" => {
                    let _ = window.close();
                }
                _ => {}
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if !window
                    .state::<DesktopState>()
                    .approved_close
                    .load(Ordering::SeqCst)
                {
                    api.prevent_close();
                    let _ = window.emit("desktop:flush-before-close", ());
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("TrackDraw desktop could not start; the project database was not reset");
    app.run(|app, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            let state = app.state::<DesktopState>();
            if !state.approved_close.load(Ordering::SeqCst) {
                state.quitting.store(true, Ordering::SeqCst);
                api.prevent_exit();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("desktop:flush-before-close", ());
                }
            }
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } if app.get_webview_window("main").is_none() => {
            let _ = create_window(app);
        }
        _ => {}
    });
}
