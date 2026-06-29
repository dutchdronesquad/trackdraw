const CONFIGURATION = JSON.stringify({
  url: "/api/v1/openapi.json",
  theme: "default",
  layout: "modern",
  showSidebar: true,
  defaultOpenFirstTag: true,
  defaultOpenAllTags: true,
  expandAllResponses: true,
  orderSchemaPropertiesBy: "preserve",
  orderRequiredPropertiesFirst: true,
  documentDownloadType: "json",
  showOperationId: true,
});

const titles = {
  en: "TrackDraw API Docs",
  nl: "TrackDraw API-documentatie",
} as const;

function getLocaleFromRequest(request: Request): keyof typeof titles {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)trackdraw-locale=(en|nl)(?:;|$)/);
  if (match?.[1] === "nl") return "nl";
  if (match?.[1] === "en") return "en";

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [locale = "", quality = "q=1"] = part.trim().split(";");
      const q = Number(quality.trim().replace(/^q=/, ""));
      return { locale: locale.toLowerCase().split("-")[0], q };
    })
    .sort((a, b) => b.q - a.q)
    .find((entry) => entry.locale === "nl" || entry.locale === "en")?.locale ===
    "nl"
    ? "nl"
    : "en";
}

function renderHtml(locale: keyof typeof titles) {
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <title>${titles[locale]}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.60.0"
      integrity="sha384-4BdmZQQTc462+ocGPo+GP3Hi/eQjMQTmNkSU9J5w3FD6hGUEmU2PqNRnbklONt4R"
      crossorigin="anonymous"
    ></script>
    <script type="text/javascript">
      Scalar.createApiReference('#app', ${CONFIGURATION})
    </script>
  </body>
</html>`;
}

export function GET(request: Request) {
  return new Response(renderHtml(getLocaleFromRequest(request)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      Vary: "Cookie, Accept-Language",
    },
  });
}
