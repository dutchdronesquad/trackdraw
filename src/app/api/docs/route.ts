import {
  getLocaleFromAcceptLanguage,
  isValidLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

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

const titles: Record<SupportedLocale, string> = {
  en: "TrackDraw API Docs",
  nl: "TrackDraw API-documentatie",
  de: "TrackDraw API-Dokumentation",
  zh: "TrackDraw API 文档",
};

function getLocaleFromRequest(request: Request): SupportedLocale {
  const cookie = request.headers.get("cookie") ?? "";
  const cookieLocale = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("trackdraw-locale="))
    ?.slice("trackdraw-locale=".length);

  if (isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  return getLocaleFromAcceptLanguage(request.headers.get("accept-language"));
}

function renderHtml(locale: SupportedLocale) {
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
