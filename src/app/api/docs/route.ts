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

const HTML = `<!doctype html>
<html>
  <head>
    <title>TrackDraw API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script type="text/javascript">
      Scalar.createApiReference('#app', ${CONFIGURATION})
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
