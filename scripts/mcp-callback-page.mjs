import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Check, X, CircleAlert } from "lucide-react";

const statusIcon = (icon) =>
  renderToStaticMarkup(
    createElement(icon, { "aria-hidden": true, strokeWidth: 2 })
  );

// Embed the same first-party wordmarks as the consent page, without asset requests.
const logoLight = readFileSync(
  new URL(
    "../public/assets/brand/trackdraw-logo-mono-lightbg.svg",
    import.meta.url
  ),
  "utf8"
);
const logoDark = readFileSync(
  new URL(
    "../public/assets/brand/trackdraw-logo-mono-darkbg.svg",
    import.meta.url
  ),
  "utf8"
);

const messages = {
  approved: {
    title: "Connection approved",
    body: "Return to your app to continue with TrackDraw.",
    detail: "You can close this window.",
    icon: statusIcon(Check),
  },
  declined: {
    title: "Connection declined",
    body: "You haven’t approved this connection to TrackDraw.",
    detail: "You can close this window, or return to your app to try again.",
    icon: statusIcon(X),
  },
  invalid: {
    title: "Unable to approve connection",
    body: "This authorization callback could not be verified.",
    detail: "Return to your app and start the connection again.",
    icon: statusIcon(CircleAlert),
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
    /* Match globals.css tokens and the MCP consent page shell. */
    :root { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: oklch(0.09 0 0); background: oklch(0.985 0 0); --muted: oklch(0.45 0 0); --brand: #1e93db; --secondary: #f0761d; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; -webkit-font-smoothing: antialiased; }
    .shell { position: relative; isolation: isolate; overflow: hidden; min-height: 100svh; }
    .glow { position: absolute; z-index: -1; border-radius: 50%; filter: blur(64px); opacity: .1; pointer-events: none; }
    .glow-primary { top: 64px; left: 50%; width: 288px; height: 288px; transform: translateX(-135%); background: var(--brand); }
    .glow-secondary { right: 0; bottom: 40px; width: 320px; height: 320px; transform: translateX(25%); background: var(--secondary); }
    .layout { max-width: 1280px; min-height: 100svh; margin: 0 auto; display: flex; flex-direction: column; padding: 24px; }
    header { height: 48px; display: flex; align-items: center; }
    .logo { width: 144px; height: 32px; opacity: .9; }
    .logo svg { display: block; width: 100%; height: 100%; }
    .logo-dark { display: none; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 64px 0 112px; }
    section { width: 100%; max-width: 760px; text-align: center; }
    .icon { display: grid; place-items: center; margin: 0 auto 40px; width: 112px; height: 112px; border-radius: 28px; border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent); background: color-mix(in srgb, var(--brand) 12%, transparent); color: var(--brand); }
    .icon svg { width: 56px; height: 56px; }
    .eyebrow { color: var(--muted); font-size: 13px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; }
    h1 { margin: 16px 0 24px; font-size: 36px; line-height: 1.03; letter-spacing: -.025em; font-weight: 600; text-wrap: balance; }
    p { margin: 0; color: var(--muted); font-size: 14px; line-height: 28px; text-wrap: pretty; }
    .detail { margin-top: 28px; font-size: 18px; }
    @media (min-width: 640px) {
      .layout { padding: 24px 32px; }
      .logo { width: 180px; height: 36px; }
      h1 { font-size: 48px; }
      p { font-size: 22px; line-height: 32px; }
    }
    @media (min-width: 1024px) {
      .layout { padding: 24px 32px; }
      h1 { font-size: 56px; }
    }
    @media (max-width: 639px) {
      .glow { display: none; }
      .icon { width: 80px; height: 80px; border-radius: 20px; margin-bottom: 32px; }
      .icon svg { width: 40px; height: 40px; }
      .detail { font-size: 14px; }
    }
    @media (prefers-color-scheme: dark) {
      :root { color: oklch(0.96 0.004 245); background: oklch(0.155 0.012 245); --muted: oklch(0.68 0.014 245); --brand: #63b8ea; --secondary: #f08f47; }
      .logo-light { display: none; }
      .logo-dark { display: block; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="glow glow-primary" aria-hidden="true"></div>
    <div class="glow glow-secondary" aria-hidden="true"></div>
    <div class="layout">
      <header aria-label="TrackDraw">
        <span class="logo logo-light" aria-hidden="true">${logoLight}</span>
        <span class="logo logo-dark" aria-hidden="true">${logoDark}</span>
      </header>
  <main>
    <section aria-labelledby="title">
      <div class="icon" aria-hidden="true">${icon}</div>
      <div class="eyebrow">TrackDraw connection</div>
      <h1 id="title">${title}</h1>
      <p>${body}</p>
      <p class="detail">${detail}</p>
    </section>
  </main>
    </div>
  </div>
</body>
</html>`;
}
