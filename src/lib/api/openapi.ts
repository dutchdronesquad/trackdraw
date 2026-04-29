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
  timing_markers: [],
  updated_at: "2026-04-28T12:29:48.000Z",
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
        "Small bearer-authenticated packages for RotorHazard livestream minimaps and timing overlays.",
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
            headers: {
              "RateLimit-Limit": {
                $ref: "#/components/headers/RateLimitLimit",
              },
              "RateLimit-Remaining": {
                $ref: "#/components/headers/RateLimitRemaining",
              },
              "RateLimit-Reset": {
                $ref: "#/components/headers/RateLimitReset",
              },
            },
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
        parameters: [{ $ref: "#/components/parameters/Limit" }],
        responses: {
          "200": {
            description: "Cursor-paginated project summaries.",
            headers: {
              "RateLimit-Limit": {
                $ref: "#/components/headers/RateLimitLimit",
              },
              "RateLimit-Remaining": {
                $ref: "#/components/headers/RateLimitRemaining",
              },
              "RateLimit-Reset": {
                $ref: "#/components/headers/RateLimitReset",
              },
            },
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
          "Returns a compact route, obstacle, and timing package for livestream minimaps. This endpoint is designed for overlay consumers and excludes full editor JSON.",
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
          "Compact livestream minimap package with route geometry, numbered route obstacles, timing markers, and route positions.",
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
          route_obstacles: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          timing_markers: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          updated_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;
