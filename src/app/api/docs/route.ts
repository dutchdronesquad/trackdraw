import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/api/v1/openapi.json",
  pageTitle: "TrackDraw API Docs",
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
