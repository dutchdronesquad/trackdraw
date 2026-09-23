const jsonMediaType = "application/json";
const problemMediaType = "application/problem+json";

function jsonContent(schema: object, example?: object) {
  return {
    [jsonMediaType]: {
      schema,
      ...(example ? { example } : {}),
    },
  };
}

function problemContent(example: object) {
  return {
    [problemMediaType]: {
      schema: { $ref: "#/components/schemas/ProblemDetails" },
      example,
    },
  };
}

function envelope(schema: object) {
  return {
    type: "object",
    required: ["data", "meta"],
    properties: {
      data: schema,
      meta: { $ref: "#/components/schemas/ApiMeta" },
    },
  };
}

function listEnvelope(itemSchema: object) {
  return {
    type: "object",
    required: ["data", "pagination", "meta"],
    properties: {
      data: {
        type: "array",
        items: itemSchema,
      },
      pagination: { $ref: "#/components/schemas/Pagination" },
      meta: { $ref: "#/components/schemas/ApiMeta" },
    },
  };
}

const unauthorizedExample = {
  title: "Unauthorized",
  status: 401,
  detail: "A valid API bearer key is required.",
  code: "unauthorized",
};

const rateLimitedExample = {
  title: "Too Many Requests",
  status: 429,
  detail: "Too many requests for this API key. Try again later.",
  code: "rate_limited",
};

const projectExample = {
  type: "project",
  id: "project_123",
  title: "Club race layout",
  field: {
    width: 60,
    height: 40,
    unit: "m",
  },
  shape_count: 18,
  created_at: "2026-04-28T09:00:00.000Z",
  updated_at: "2026-04-28T12:30:00.000Z",
};

const trackPackageExample = {
  type: "track",
  schema: "trackdraw.track.v1",
  source: { type: "project", id: "project_123" },
  title: "Club race layout",
  field: {
    width: 60,
    height: 40,
    origin: "tl",
    unit: "m",
  },
  shape_count: 18,
  timing_markers: [],
  updated_at: "2026-04-28T12:29:48.000Z",
  shapes: [],
};

const overlayPackageExample = {
  type: "overlay_track",
  schema: "trackdraw.overlay.v1",
  source: { type: "project", id: "project_123" },
  title: "Club race layout",
  field: {
    width: 60,
    height: 40,
    origin: "tl",
    unit: "m",
  },
  route: {
    shape_id: "route_123",
    closed: false,
    length_m: 126.4,
    waypoints: [
      { x: 8, y: 20, z: 0 },
      { x: 28, y: 12, z: 1.5 },
    ],
    sampled_points: [
      { x: 8, y: 20 },
      { x: 12.4, y: 18.2 },
    ],
  },
  route_status: "ready",
  duration_estimate: {
    estimated_lap_ms: 12600,
    route_length_m: 126.4,
    assumed_speed_mps: 10,
    source: "trackdraw_default",
    confidence: "low",
  },
  route_obstacles: [
    {
      id: "gate_1",
      kind: "gate",
      name: "Gate 1",
      x: 12,
      y: 18,
      rotation: 90,
      route_number: 1,
      route_position: {
        distance_m: 14.2,
        progress: 0.112,
        x: 12.1,
        y: 18.1,
        offset_m: 0.2,
      },
      width: 3,
      height: 1.8,
    },
  ],
  timing_markers: [
    {
      shape_id: "gate_1",
      role: "start_finish",
      timing_id: null,
      split_index: null,
      title: "Start / finish",
      position: { x: 12, y: 18 },
      route_position: {
        distance_m: 14.2,
        progress: 0.112,
        x: 12.1,
        y: 18.1,
        offset_m: 0.2,
      },
    },
  ],
  readiness: {
    status: "ready",
    race_route_id: "route_123",
    route_length_m: 126.4,
    issues: [],
    timing_points: [
      {
        shape_id: "gate_1",
        role: "start_finish",
        timing_id: null,
        split_index: null,
        title: "Start / finish",
        path_distance_m: 0.2,
        projected_point: { x: 12.1, y: 18.1 },
        route_distance_m: 14.2,
        route_progress: 0.112,
      },
    ],
  },
  updated_at: "2026-04-28T12:29:48.000Z",
};

const viewerSnapshotPackageExample = {
  type: "viewer_snapshot",
  schema: "trackdraw.viewer-snapshot.v1",
  snapshot_id:
    "sha256:299f0cd7490dbec6f7b6e04707c1cc07fc834d99056f394a041befb3fc531059",
  required_viewer: {
    schema: "trackdraw.viewer-snapshot.v1",
    min_renderer_version: "0.1.0",
    capabilities: [
      "shape:gate",
      "shape:barrier",
      "shape:polyline",
      "catalog:multigp",
    ],
  },
  design: {
    version: 2,
    title: "Club race layout",
    field: {
      width: 60,
      height: 40,
      origin: "tl",
      grid_step: 2,
      ppm: 20,
    },
    shapes: [
      {
        id: "gate",
        x: 15,
        y: 12,
        rotation: 20,
        kind: "gate",
        width: 3,
        height: 2,
      },
      {
        id: "hurdle",
        x: 25,
        y: 20,
        rotation: 0,
        meta: {
          catalog: {
            version: 1,
            element_id: "multigp-hurdle",
            assigned_kind: "barrier",
            official: true,
            snapshot: {
              name: "MultiGP Hurdle",
              organization: "MultiGP",
              dimensions_label: "5x10",
            },
          },
        },
        kind: "barrier",
        variant: "banner",
        width: 3.048,
        height: 1.524,
      },
      {
        id: "path",
        x: 0,
        y: 0,
        rotation: 0,
        kind: "polyline",
        points: [
          {
            x: 4,
            y: 12,
          },
          {
            x: 15,
            y: 12,
          },
          {
            x: 25,
            y: 20,
          },
          {
            x: 45,
            y: 30,
          },
        ],
        show_arrows: true,
      },
    ],
    updated_at: "2026-09-23T00:00:00.000Z",
  },
  assets: [
    {
      path: "/assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp",
      content_type: "image/webp",
      size_bytes: 28334,
      sha256:
        "39d71f74ce744e32ff4a57a70366e9d18f4aa5dc118378399597580726ddbb40",
    },
  ],
  source: {
    type: "project",
    id: "project_123",
  },
  title: "Club race layout",
  updated_at: "2026-09-23T00:00:00.000Z",
};

export const trackdrawOpenApiSchema = {
  openapi: "3.1.0",
  info: {
    title: "TrackDraw REST API",
    version: "1.0.0",
    summary: "Read-only TrackDraw integration API.",
    description: [
      "The TrackDraw REST API gives external tools a stable way to read account-backed track data and integration packages.",
      "",
      "Use it to connect project metadata, track geometry, timing markers, and livestream overlay data to tools outside TrackDraw.",
      "",
      "The API is versioned, read-only in v1, and designed around explicit account ownership and expiring API keys.",
    ].join("\n"),
    contact: {
      name: "TrackDraw",
      url: "https://trackdraw.app",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current TrackDraw origin",
    },
  ],
  tags: [
    {
      name: "Identity",
      description:
        "Bearer-authenticated setup and diagnostics endpoints for external integrations.",
    },
    {
      name: "Projects",
      description:
        "Bearer-authenticated read endpoints for active projects owned by the API key account. These endpoints require the `tracks:read` permission.",
    },
    {
      name: "RotorHazard",
      description:
        "Small bearer-authenticated packages for RotorHazard livestream map overlays and timing overlays.",
    },
  ],
  "x-tagGroups": [
    {
      name: "Account setup",
      tags: ["Identity"],
    },
    {
      name: "Track data",
      tags: ["Projects"],
    },
    {
      name: "Integrations",
      tags: ["RotorHazard"],
    },
  ],
  paths: {
    "/api/v1/me": {
      get: {
        tags: ["Identity"],
        operationId: "getApiIdentity",
        summary: "Get API identity",
        description:
          "Returns minimal account identity and bearer-key capabilities. Use this endpoint to verify that an integration has a valid key before requesting project data.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Account identity and current bearer-key capabilities.",
            content: jsonContent(
              envelope({ $ref: "#/components/schemas/ApiIdentity" }),
              {
                data: {
                  type: "api_identity",
                  account: {
                    id: "user_123",
                    name: "Race Director",
                  },
                  permissions: { tracks: ["read"] },
                  expires_at: "2026-07-27T09:00:00.000Z",
                },
                meta: { api_version: "v1" },
              }
            ),
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/v1/projects": {
      get: {
        tags: ["Projects"],
        operationId: "listProjects",
        summary: "List projects",
        description:
          "Lists active account-backed projects owned by the API key account. The endpoint does not include archived projects and does not expose projects owned by other accounts.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Cursor" },
        ],
        responses: {
          "200": {
            description: "Cursor-paginated project summaries.",
            content: jsonContent(
              listEnvelope({ $ref: "#/components/schemas/ProjectSummary" }),
              {
                data: [projectExample],
                pagination: {
                  limit: 50,
                  next_cursor: null,
                  has_more: false,
                },
                meta: { api_version: "v1" },
              }
            ),
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/v1/projects/{projectId}": {
      get: {
        tags: ["Projects"],
        operationId: "getProject",
        summary: "Get project metadata",
        description:
          "Returns ownership-safe metadata for one project owned by the API key account. Use this before downloading a full track package when an integration only needs project identity and timestamps.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ProjectId" }],
        responses: {
          "200": {
            description: "One project summary.",
            content: jsonContent(
              envelope({ $ref: "#/components/schemas/ProjectSummary" }),
              {
                data: projectExample,
                meta: { api_version: "v1" },
              }
            ),
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/v1/projects/{projectId}/track": {
      get: {
        tags: ["Projects"],
        operationId: "getProjectTrack",
        summary: "Get project track package",
        description:
          "Returns the integration-stable track package for one project owned by the API key account. The package includes sanitized shape geometry and excludes editor-only data.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ProjectId" }],
        responses: {
          "200": {
            description: "Track package for one project.",
            content: jsonContent(
              envelope({ $ref: "#/components/schemas/TrackPackage" }),
              {
                data: {
                  ...trackPackageExample,
                },
                meta: { api_version: "v1" },
              }
            ),
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/v1/projects/{projectId}/overlay": {
      get: {
        tags: ["RotorHazard"],
        operationId: "getProjectOverlay",
        summary: "Get livestream data",
        description:
          "Returns a compact route, obstacle, and timing package for livestream map overlays. This endpoint is designed for overlay consumers and excludes full editor JSON.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ProjectId" }],
        responses: {
          "200": {
            description: "Livestream overlay package for one project.",
            content: jsonContent(
              envelope({ $ref: "#/components/schemas/OverlayPackage" }),
              {
                data: overlayPackageExample,
                meta: { api_version: "v1" },
              }
            ),
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/v1/projects/{projectId}/viewer-snapshot": {
      get: {
        tags: ["Projects"],
        operationId: "getProjectViewerSnapshot",
        summary: "Get viewer snapshot",
        description:
          "Returns a portable, allowlisted course snapshot for one account-owned project, for rendering with the @trackdraw/viewer package. Excludes author name, inventory, tags, description, map reference, and any shape metadata beyond catalog provenance.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/ProjectId" }],
        responses: {
          "200": {
            description: "Viewer snapshot package for one project.",
            content: jsonContent(
              envelope({ $ref: "#/components/schemas/ViewerSnapshotPackage" }),
              {
                data: viewerSnapshotPackageExample,
                meta: { api_version: "v1" },
              }
            ),
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    parameters: {
      ProjectId: {
        name: "projectId",
        in: "path",
        required: true,
        description: "Account-backed TrackDraw project id.",
        schema: { type: "string" },
        example: "project_123",
      },
      Limit: {
        name: "limit",
        in: "query",
        required: false,
        description:
          "Maximum number of records to return. The v1 default is 50 and the maximum is 100.",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        example: 50,
      },
      Cursor: {
        name: "cursor",
        in: "query",
        required: false,
        description:
          "Opaque pagination cursor from a previous response's next_cursor. A 400 bad_request response means the cursor is stale or invalid - retry the request without a cursor parameter to start over.",
        schema: { type: "string" },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "TrackDraw API key",
        description:
          "Use `Authorization: Bearer <api_key>` for `/api/v1/*` data endpoints. API keys expire and can be revoked from account settings.",
      },
    },
    headers: {
      RetryAfter: {
        description: "Seconds to wait before retrying a throttled request.",
        schema: { type: "integer", minimum: 1, example: 60 },
      },
      RateLimitLimit: {
        description: "Request budget for the current rate-limit window.",
        schema: { type: "integer", example: 600 },
      },
      RateLimitRemaining: {
        description: "Requests remaining in the current rate-limit window.",
        schema: { type: "integer", example: 599 },
      },
      RateLimitReset: {
        description: "Seconds until the current rate-limit window resets.",
        schema: { type: "integer", example: 3600 },
      },
    },
    responses: {
      BadRequest: {
        description: "The request was invalid.",
        content: problemContent({
          title: "Bad Request",
          status: 400,
          detail: "Missing project id.",
          code: "bad_request",
        }),
      },
      Unauthorized: {
        description:
          "The bearer key is missing, invalid, expired, disabled, or lacks the required permission.",
        content: problemContent(unauthorizedExample),
      },
      NotFound: {
        description:
          "The requested resource does not exist or is not owned by the API key account.",
        content: problemContent({
          title: "Not Found",
          status: 404,
          detail: "Project not found.",
          code: "not_found",
        }),
      },
      RateLimited: {
        description: "The API key has exceeded its request budget.",
        headers: {
          "Retry-After": { $ref: "#/components/headers/RetryAfter" },
          "RateLimit-Limit": { $ref: "#/components/headers/RateLimitLimit" },
          "RateLimit-Remaining": {
            $ref: "#/components/headers/RateLimitRemaining",
          },
          "RateLimit-Reset": { $ref: "#/components/headers/RateLimitReset" },
        },
        content: problemContent(rateLimitedExample),
      },
      InternalError: {
        description: "The server could not complete the request.",
        content: problemContent({
          title: "Internal Server Error",
          status: 500,
          detail: "Failed to list projects.",
          code: "internal_error",
        }),
      },
    },
    schemas: {
      ApiMeta: {
        type: "object",
        required: ["api_version"],
        properties: {
          api_version: {
            type: "string",
            const: "v1",
          },
        },
      },
      Pagination: {
        type: "object",
        required: ["limit", "next_cursor", "has_more"],
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 100, example: 50 },
          next_cursor: {
            type: ["string", "null"],
            description: "Opaque cursor for the next page.",
          },
          has_more: { type: "boolean" },
        },
      },
      ProblemDetails: {
        type: "object",
        required: ["title", "status", "detail", "code"],
        properties: {
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          code: { type: "string" },
        },
      },
      ApiKeyPermissions: {
        type: "object",
        description:
          "Permission map stored on an API key. v1 project reads require `tracks:read`.",
        additionalProperties: {
          type: "array",
          items: { type: "string" },
        },
        example: { tracks: ["read"] },
      },
      ApiIdentity: {
        type: "object",
        description:
          "Minimal account and bearer-key capability metadata for integration setup checks.",
        required: ["type", "account", "permissions", "expires_at"],
        properties: {
          type: { type: "string", const: "api_identity" },
          account: {
            type: "object",
            required: ["id", "name"],
            properties: {
              id: { type: "string" },
              name: { type: ["string", "null"] },
            },
          },
          permissions: {
            anyOf: [
              { $ref: "#/components/schemas/ApiKeyPermissions" },
              { type: "null" },
            ],
          },
          expires_at: { type: ["string", "null"], format: "date-time" },
        },
      },
      ProjectSummary: {
        type: "object",
        description:
          "Ownership-safe project metadata. Shape geometry is only returned by the project track package endpoint.",
        required: [
          "type",
          "id",
          "title",
          "field",
          "shape_count",
          "created_at",
          "updated_at",
        ],
        properties: {
          type: { type: "string", const: "project" },
          id: { type: "string", description: "TrackDraw project id." },
          title: { type: "string", description: "Project title." },
          field: { $ref: "#/components/schemas/ProjectField" },
          shape_count: {
            type: "integer",
            minimum: 0,
            description: "Number of design shapes in the project.",
          },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      ProjectField: {
        type: "object",
        description: "Project field dimensions in meters.",
        required: ["width", "height", "unit"],
        properties: {
          width: { type: "number", description: "Field width." },
          height: { type: "number", description: "Field height." },
          unit: { type: "string", const: "m" },
        },
      },
      TrackField: {
        allOf: [
          { $ref: "#/components/schemas/ProjectField" },
          {
            type: "object",
            required: ["origin"],
            properties: {
              origin: {
                type: "string",
                enum: ["tl", "bl"],
                description:
                  "Field origin used by TrackDraw coordinates: top-left or bottom-left.",
              },
            },
          },
        ],
      },
      TrackPackage: {
        type: "object",
        description:
          "Integration-stable track package for one account-owned project. The package excludes private map-reference data.",
        required: [
          "type",
          "schema",
          "source",
          "title",
          "field",
          "shape_count",
          "timing_markers",
          "updated_at",
          "shapes",
        ],
        properties: {
          type: { type: "string", const: "track" },
          schema: { type: "string", const: "trackdraw.track.v1" },
          source: {
            type: "object",
            required: ["type", "id"],
            properties: {
              type: { type: "string", const: "project" },
              id: { type: "string" },
            },
          },
          title: { type: "string" },
          field: { $ref: "#/components/schemas/TrackField" },
          shape_count: { type: "integer", minimum: 0 },
          timing_markers: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          updated_at: { type: "string", format: "date-time" },
          shapes: {
            type: "array",
            items: { type: "object", additionalProperties: true },
            description:
              "Integration-safe shape geometry. Editor-only fields such as map references, inventory, author name, tags, shape locks, front-offset guide metadata, and shape metadata are excluded.",
          },
        },
      },
      OverlayPackage: {
        type: "object",
        description:
          "Compact livestream map overlay package with route geometry, numbered route obstacles, timing markers, and route positions.",
        required: [
          "type",
          "schema",
          "source",
          "title",
          "field",
          "route",
          "route_status",
          "route_obstacles",
          "timing_markers",
          "readiness",
          "updated_at",
        ],
        properties: {
          type: { type: "string", const: "overlay_track" },
          schema: { type: "string", const: "trackdraw.overlay.v1" },
          source: {
            type: "object",
            required: ["type", "id"],
            properties: {
              type: { type: "string", const: "project" },
              id: { type: "string" },
            },
          },
          title: { type: "string" },
          field: { $ref: "#/components/schemas/TrackField" },
          route: {
            anyOf: [
              {
                type: "object",
                required: [
                  "shape_id",
                  "closed",
                  "length_m",
                  "waypoints",
                  "sampled_points",
                ],
                properties: {
                  shape_id: { type: "string" },
                  closed: { type: "boolean" },
                  length_m: { type: "number", minimum: 0 },
                  waypoints: {
                    type: "array",
                    items: { type: "object", additionalProperties: true },
                  },
                  sampled_points: {
                    type: "array",
                    items: { type: "object", additionalProperties: true },
                  },
                },
              },
              { type: "null" },
            ],
          },
          route_status: {
            type: "string",
            enum: [
              "empty",
              "missing-route",
              "no-numbered-obstacles",
              "no-route-matches",
              "partial",
              "ready",
            ],
          },
          duration_estimate: {
            description:
              "Optional first-lap baseline for overlay runtimes before real RotorHazard lap or split data exists. Consumers should replace it with live timing data as soon as possible.",
            anyOf: [
              {
                type: "object",
                required: [
                  "estimated_lap_ms",
                  "route_length_m",
                  "assumed_speed_mps",
                  "source",
                  "confidence",
                ],
                properties: {
                  estimated_lap_ms: { type: "integer", minimum: 0 },
                  route_length_m: { type: "number", minimum: 0 },
                  assumed_speed_mps: { type: "number", minimum: 0 },
                  source: {
                    type: "string",
                    enum: ["trackdraw_default"],
                  },
                  confidence: { type: "string", enum: ["low"] },
                },
                additionalProperties: false,
              },
              { type: "null" },
            ],
          },
          route_obstacles: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          timing_markers: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          readiness: {
            type: "object",
            description:
              "Overlay readiness report for setup validation and route-progress timing anchors.",
            required: [
              "status",
              "race_route_id",
              "route_length_m",
              "issues",
              "timing_points",
            ],
            properties: {
              status: { type: "string", enum: ["ready", "blocked"] },
              race_route_id: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              route_length_m: {
                anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
              },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  required: ["type", "severity"],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "duplicate-start-finish",
                        "duplicate-timing-id",
                        "missing-route",
                        "missing-split-id",
                        "missing-start-finish",
                        "multiple-routes",
                        "timing-point-off-route",
                      ],
                    },
                    severity: { type: "string", enum: ["error"] },
                    shape_id: { type: "string" },
                    shape_ids: {
                      type: "array",
                      items: { type: "string" },
                    },
                    route_id: { type: "string" },
                    timing_id: { type: "string" },
                    distance_m: { type: "number", minimum: 0 },
                    tolerance_m: { type: "number", minimum: 0 },
                  },
                  additionalProperties: false,
                },
              },
              timing_points: {
                type: "array",
                items: {
                  type: "object",
                  required: [
                    "shape_id",
                    "role",
                    "timing_id",
                    "split_index",
                    "title",
                    "path_distance_m",
                    "projected_point",
                    "route_distance_m",
                    "route_progress",
                  ],
                  properties: {
                    shape_id: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["start_finish", "split"],
                    },
                    timing_id: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    split_index: {
                      anyOf: [
                        { type: "integer", minimum: 0 },
                        { type: "null" },
                      ],
                      description:
                        "Zero-based TrackDraw split order along the route. This is null for start/finish timing points.",
                    },
                    title: { type: "string" },
                    path_distance_m: {
                      anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
                    },
                    projected_point: {
                      anyOf: [
                        {
                          type: "object",
                          required: ["x", "y"],
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                          },
                        },
                        { type: "null" },
                      ],
                    },
                    route_distance_m: {
                      anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
                    },
                    route_progress: {
                      anyOf: [
                        { type: "number", minimum: 0, maximum: 1 },
                        { type: "null" },
                      ],
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
          },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      ViewerSnapshotPackage: {
        type: "object",
        description:
          "Portable, allowlisted course snapshot for rendering with the @trackdraw/viewer package. Convert this API data envelope with viewerSnapshotFromApi before validation/rendering or createViewerArchive. Excludes author name, inventory, tags, description, map reference, and any shape metadata beyond catalog provenance.",
        required: [
          "type",
          "schema",
          "source",
          "title",
          "updated_at",
          "snapshot_id",
          "required_viewer",
          "design",
          "assets",
        ],
        properties: {
          type: { type: "string", const: "viewer_snapshot" },
          schema: { type: "string", const: "trackdraw.viewer-snapshot.v1" },
          source: {
            type: "object",
            required: ["type", "id"],
            properties: {
              type: { type: "string", const: "project" },
              id: { type: "string" },
            },
          },
          title: { type: "string" },
          updated_at: { type: "string", format: "date-time" },
          snapshot_id: {
            type: "string",
            description:
              "Deterministic SHA-256 identity of the canonical public snapshot content.",
          },
          required_viewer: {
            type: "object",
            description:
              "Compatibility requirement: the installed @trackdraw/viewer renderer must be >= min_renderer_version and support every listed capability.",
            required: ["schema", "min_renderer_version", "capabilities"],
            properties: {
              schema: {
                type: "string",
                const: "trackdraw.viewer-snapshot.v1",
              },
              min_renderer_version: { type: "string" },
              capabilities: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          design: {
            type: "object",
            required: ["version", "title", "field", "shapes", "updated_at"],
            properties: {
              version: { type: "integer", const: 2 },
              title: { type: "string" },
              field: {
                type: "object",
                required: ["width", "height", "origin", "grid_step", "ppm"],
                properties: {
                  width: { type: "number", minimum: 0 },
                  height: { type: "number", minimum: 0 },
                  origin: { type: "string", enum: ["tl", "bl"] },
                  grid_step: { type: "number", minimum: 0 },
                  ppm: { type: "number", minimum: 0 },
                },
              },
              shapes: {
                type: "array",
                items: { type: "object", additionalProperties: true },
                description:
                  "Render-fidelity shape geometry. shape.meta is narrowed to catalog provenance only.",
              },
              updated_at: { type: "string", format: "date-time" },
            },
          },
          assets: {
            type: "array",
            description:
              "Required catalog textures referenced by path (not byte-embedded) - content type, size, and hash for integrity checks.",
            items: {
              type: "object",
              required: ["path", "content_type", "size_bytes", "sha256"],
              properties: {
                path: { type: "string" },
                content_type: { type: "string" },
                size_bytes: { type: "integer", minimum: 0 },
                sha256: { type: "string" },
                attribution: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;
