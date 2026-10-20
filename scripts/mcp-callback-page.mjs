const messages = {
  approved: {
    title: "Connection approved",
    body: "Return to your app to continue with TrackDraw.",
    detail: "You can close this window.",
    icon: '<path d="m6 12 4 4 8-8"/>',
  },
  declined: {
    title: "Connection declined",
    body: "You haven’t approved this connection to TrackDraw.",
    detail: "You can close this window, or return to your app to try again.",
    icon: '<path d="m8 8 8 8M8 16l8-8"/>',
  },
  invalid: {
    title: "Unable to approve connection",
    body: "This authorization callback could not be verified.",
    detail: "Return to your app and start the connection again.",
    icon: '<path d="M12 7v6m0 4h.01"/>',
  },
};

// Only fixed copy is rendered: never include callback parameters or credentials.
export function renderMcpCallbackPage(status) {
  const { title, body, detail, icon } = messages[status] ?? messages.invalid;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title} · TrackDraw</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17191c; background: #fafafa; --muted: #5c6470; --brand: #147cb9; --border: #dde4e9; --tint: #e7f3fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; display: flex; flex-direction: column; background: radial-gradient(ellipse at 20% 25%, #1e93db0d, transparent 55%), radial-gradient(ellipse at 90% 90%, #1e93db0a, transparent 45%); }
    header { padding: 32px clamp(24px, 5vw, 72px); font-size: 23px; font-weight: 750; letter-spacing: -1px; }
    header span { color: var(--brand); }
    main { flex: 1; display: grid; place-items: center; padding: 40px 24px 100px; }
    section { width: 100%; max-width: 520px; text-align: center; }
    .icon { display: grid; place-items: center; margin: 0 auto 28px; width: 72px; height: 72px; border-radius: 50%; background: var(--tint); color: var(--brand); }
    svg { width: 32px; height: 32px; }
    .eyebrow { color: var(--brand); font-size: 11px; font-weight: 650; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 16px 0 20px; font-size: clamp(32px, 6vw, 46px); line-height: 1.12; letter-spacing: -.045em; font-weight: 650; }
    p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.7; text-wrap: pretty; }
    .detail { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); font-size: 14px; }
    @media (prefers-color-scheme: dark) {
      :root { color: #f3f5f7; background: #1c2025; --muted: #aab4c0; --brand: #63b8ea; --border: #343e48; --tint: #253b4b; }
    }
  </style>
</head>
<body>
  <header aria-label="TrackDraw">Track<span>Draw</span></header>
  <main>
    <section aria-labelledby="title">
      <div class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
      <div class="eyebrow">TrackDraw connection</div>
      <h1 id="title">${title}</h1>
      <p>${body}</p>
      <p class="detail">${detail}</p>
    </section>
  </main>
</body>
</html>`;
}
