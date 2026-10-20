/** Resume the original OAuth request after either passkey or magic-link login. */
export function getMcpLoginContinuation(search: string): string | null {
  const query = new URLSearchParams(search);
  if (!query.has("sig") || !query.has("ba_param") || !query.has("client_id"))
    return null;
  const authorization = new URLSearchParams();
  const names = [
    "client_id",
    "redirect_uri",
    "response_type",
    "scope",
    "state",
    "code_challenge",
    "code_challenge_method",
    "resource",
    "prompt",
    "max_age",
    "nonce",
  ];
  for (const name of names) {
    for (const value of query.getAll(name)) authorization.append(name, value);
  }
  // Always return to our authorization endpoint. It validates the client,
  // redirect, resource, PKCE and consent again before any external redirect.
  return `/api/auth/oauth2/authorize?${authorization}`;
}
