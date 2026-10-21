import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { renderMcpCallbackPage } from "./mcp-callback-page.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  auth,
  discoverOAuthServerInfo,
  refreshAuthorization,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";

const checkRevocation = process.env.TRACKDRAW_MCP_CHECK_REVOCATION === "1";
const editTrack = process.env.TRACKDRAW_MCP_EDIT_TRACK === "1";
const createTrack = editTrack || process.env.TRACKDRAW_MCP_CREATE_TRACK === "1";
const scope = `mcp:read projects:read${createTrack ? " projects:create" : ""}${editTrack ? " projects:update" : ""} offline_access`;
let endpoint;
try {
  endpoint = new URL(process.env.TRACKDRAW_MCP_URL);
  assert.equal(endpoint.pathname, "/api/mcp");
  assert.equal(
    endpoint.search + endpoint.username + endpoint.password + endpoint.hash,
    ""
  );
  assert.ok(
    endpoint.protocol === "https:" ||
      (endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname))
  );
} catch {
  console.error(
    "Set TRACKDRAW_MCP_URL to an HTTPS /api/mcp endpoint or a loopback HTTP preview URL, without credentials, query or fragment."
  );
  process.exit(1);
}

function toolErrorCode(result) {
  const text = result.content.find((item) => item.type === "text");
  assert.equal(text?.type, "text");
  return JSON.parse(text.text).error?.code;
}

// Credentials stay in this process only. The SDK owns discovery, public-client
// registration, S256 PKCE, resource indicators and authorization-code exchange.
let registration;
let tokens;
let verifier;
let redirectUrl;
const state = randomBytes(32).toString("base64url");
let resolveCallback;
let rejectCallback;
const callback = new Promise((resolve, reject) => {
  resolveCallback = resolve;
  rejectCallback = reject;
});
void callback.catch(() => {});
const provider = {
  get redirectUrl() {
    return redirectUrl;
  },
  get clientMetadata() {
    return {
      client_name: "TrackDraw MCP connection check",
      redirect_uris: [redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope,
    };
  },
  state: () => state,
  clientInformation: () => registration,
  saveClientInformation: (value) => {
    registration = value;
  },
  tokens: () => tokens,
  saveTokens: (value) => {
    tokens = value;
  },
  saveCodeVerifier: (value) => {
    verifier = value;
  },
  codeVerifier: () => verifier,
  redirectToAuthorization: (url) => {
    console.log(`Authorize TrackDraw in your browser: ${url.href}`);
  },
};
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  );
  const url = new URL(request.url, redirectUrl);
  const suppliedState = Buffer.from(url.searchParams.get("state") ?? "");
  const expectedState = Buffer.from(state);
  if (
    request.method !== "GET" ||
    request.headers.host !== new URL(redirectUrl).host ||
    url.pathname !== "/callback" ||
    suppliedState.length !== expectedState.length ||
    !timingSafeEqual(suppliedState, expectedState) ||
    !registration?.issuer ||
    url.searchParams.get("iss") !== registration.issuer
  ) {
    response.writeHead(400).end(renderMcpCallbackPage("invalid"));
    return;
  }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error")) {
    response.writeHead(403).end(renderMcpCallbackPage("declined"));
    rejectCallback(new Error("Authorization declined"));
    return;
  }
  response.writeHead(200).end(renderMcpCallbackPage("approved"));
  resolveCallback(code);
});
const client = new Client({ name: "trackdraw-smoke", version: "1.0.0" });
let stage = "authorization";
let failureCode;
const timeout = setTimeout(
  () => rejectCallback(new Error("Authorization timed out")),
  5 * 60_000
);
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  redirectUrl = `http://127.0.0.1:${server.address().port}/callback`;
  const unauthenticated = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get("cache-control"), "no-store");
  assert.match(
    unauthenticated.headers.get("www-authenticate"),
    /resource_metadata=/
  );
  await unauthenticated.body?.cancel();
  let transport = new StreamableHTTPClientTransport(endpoint, {
    authProvider: provider,
  });
  // Request exactly the smoke run permissions in the initial authorization.
  await auth(provider, { serverUrl: endpoint, scope });
  await transport.finishAuth(await callback);
  clearTimeout(timeout);
  try {
    await client.connect(transport);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    const code = await callback;
    await transport.finishAuth(code);
    await client.close();
    transport = new StreamableHTTPClientTransport(endpoint, {
      authProvider: provider,
    });
    await client.connect(transport);
  }
  assert.equal(client.getServerVersion()?.name, "trackdraw");
  assert.equal(transport.sessionId, undefined);
  stage = "tool discovery";
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "get_account",
      "get_track_catalog",
      ...(createTrack ? ["create_track"] : []),
      ...(editTrack
        ? ["preview_track_edit", "apply_track_edit", "list_project_versions"]
        : []),
      "list_projects",
      "get_project",
      "get_track",
      "get_overlay",
      "get_viewer_snapshot",
      "analyze_track",
      "compare_tracks",
    ]
  );
  const result = await client.callTool({ name: "get_account", arguments: {} });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent?.type, "api_identity");
  assert.equal(result.structuredContent?.mcp?.project_writes, createTrack);
  assert.equal(result.structuredContent?.mcp?.project_reads, true);
  const catalog = await client.callTool({
    name: "get_track_catalog",
    arguments: { limit: 1 },
  });
  assert.notEqual(catalog.isError, true);
  assert.equal(catalog.structuredContent?.design_version, 2);
  stage = "catalog";
  let createdProjectId;
  if (createTrack) {
    stage = "creation";
    const args = {
      idempotency_key: randomBytes(16).toString("hex"),
      proposal: {
        version: 2,
        title: "MCP 30 × 20 track",
        constraints: {
          field: { width: 30, height: 20 },
          inventory: {
            gate: 2,
            tower: 0,
            ladder: 0,
            divegate: 0,
            startfinish: 0,
            flag: 0,
            cone: 0,
            barrier: 0,
          },
        },
        shapes: [
          {
            id: "gate1",
            catalog_id: "multigp-standard-gate-5x5",
            x: 8,
            y: 10,
            rotation: 0,
          },
          {
            id: "gate2",
            kind: "gate",
            x: 20,
            y: 10,
            rotation: 0,
            width: 3,
            height: 2,
          },
        ],
      },
    };
    const created = await client.callTool({
      name: "create_track",
      arguments: args,
    });
    assert.notEqual(created.isError, true);
    createdProjectId = created.structuredContent?.project_id;
    assert.equal(typeof createdProjectId, "string");
    const retry = await client.callTool({
      name: "create_track",
      arguments: args,
    });
    assert.equal(
      retry.structuredContent?.project_id,
      created.structuredContent?.project_id
    );
    assert.equal(retry.structuredContent?.replayed, true);
    console.log(
      `Open the new track project in Studio: ${created.structuredContent?.studio_url}`
    );
  }
  stage = "project listing";
  const listed = await client.callTool({
    name: "list_projects",
    arguments: { limit: 1 },
  });
  assert.notEqual(listed.isError, true);
  assert.equal(listed.structuredContent?.type, "project_list");
  assert.ok(Array.isArray(listed.structuredContent.data));
  const projectIds = [
    ...new Set([
      createdProjectId,
      process.env.TRACKDRAW_MCP_PROJECT_ID ??
        listed.structuredContent.data[0]?.id,
    ]),
  ].filter(Boolean);
  for (const projectId of projectIds) {
    stage = "project metadata";
    const metadata = await client.callTool({
      name: "get_project",
      arguments: { project_id: projectId },
    });
    assert.notEqual(metadata.isError, true);
    assert.equal(metadata.structuredContent?.project?.id, projectId);
    stage = "track pagination";
    // Walk complete shape pages; bounded to fit the account/client request budget.
    let cursor;
    const seen = new Set();
    let count = 0;
    let checkedRoute = false;
    for (let page = 0; ; page++) {
      assert.ok(page < 100, "Track pagination exceeded the smoke budget");
      const track = await client.callTool({
        name: "get_track",
        arguments: {
          project_id: projectId,
          limit: 50,
          ...(cursor ? { cursor } : {}),
        },
      });
      assert.notEqual(track.isError, true);
      const content = track.structuredContent;
      assert.equal(content?.source?.id, projectId);
      count += content.shapes.length;
      // Inspect route geometry separately; shape summaries intentionally omit it.
      for (const shape of content.shapes
        .filter((item) => !checkedRoute && item.point_count > 0)
        .slice(0, 1)) {
        checkedRoute = true;
        const geometry = await client.callTool({
          name: "get_track",
          arguments: { project_id: projectId, shape_id: shape.id, limit: 50 },
        });
        assert.notEqual(geometry.isError, true);
        assert.equal(
          geometry.structuredContent?.pagination?.total,
          shape.point_count
        );
        assert.equal(
          geometry.structuredContent?.shape?.points.length,
          Math.min(50, shape.point_count)
        );
        if (geometry.structuredContent.pagination.has_more) {
          const next = await client.callTool({
            name: "get_track",
            arguments: {
              project_id: projectId,
              shape_id: shape.id,
              limit: 50,
              cursor: geometry.structuredContent.pagination.next_cursor,
            },
          });
          assert.notEqual(next.isError, true);
          assert.equal(
            next.structuredContent?.shape?.points.length,
            Math.min(50, shape.point_count - 50)
          );
        }
      }
      if (!content.pagination.has_more) {
        assert.equal(count, content.pagination.total);
        break;
      }
      cursor = content.pagination.next_cursor;
      assert.equal(typeof cursor, "string");
      assert.ok(!seen.has(cursor), "Repeated track cursor");
      seen.add(cursor);
    }
    if (editTrack && projectId === createdProjectId) {
      // Only the project created by this run is ever edited.
      assert.equal(projectId, createdProjectId);
      const baseRevision = metadata.structuredContent.project.revision;
      const call = async (name, args) => {
        stage = name;
        const result = await client.callTool({
          name,
          arguments: { project_id: projectId, ...args },
        });
        assert.notEqual(result.isError, true);
        return result.structuredContent;
      };
      const preview = async (x) =>
        call("preview_track_edit", {
          base_revision: baseRevision,
          changes: [{ shape_id: "gate1", patch: { x } }],
        });
      const first = await preview(10);
      const stale = await preview(12);
      assert.equal(
        (await call("get_project", {})).project.revision,
        baseRevision
      );
      const apply = {
        base_revision: baseRevision,
        proposal_id: first.proposal_id,
      };
      const applied = await call("apply_track_edit", apply);
      assert.equal(applied.revision, baseRevision + 1);
      assert.equal((await call("apply_track_edit", apply)).replayed, true);
      const conflict = await client.callTool({
        name: "apply_track_edit",
        arguments: {
          project_id: projectId,
          base_revision: baseRevision,
          proposal_id: stale.proposal_id,
        },
      });
      assert.equal(conflict.isError, true);
      assert.equal(toolErrorCode(conflict), "revision_conflict");
      const versions = await call("list_project_versions", {});
      assert.ok(
        versions.versions.some(
          (version) => version.version_id === applied.previous_version_id
        )
      );
      const recovery = await call("preview_track_edit", {
        base_revision: applied.revision,
        restore_version_id: applied.previous_version_id,
      });
      const restored = await call("apply_track_edit", {
        base_revision: applied.revision,
        proposal_id: recovery.proposal_id,
      });
      assert.equal(restored.revision, baseRevision + 2);
      assert.equal((await call("get_track", { shape_id: "gate1" })).shape.x, 8);
      const oldRetry = await call("apply_track_edit", apply);
      assert.equal(oldRetry.revision, applied.revision);
      assert.equal(oldRetry.current_revision, restored.revision);
      assert.equal(oldRetry.replayed, true);
      console.log(
        "Edit workflow passed: preview, apply, retry, conflict and recovery."
      );
    }
    stage = "material analysis";
    const analysis = await client.callTool({
      name: "analyze_track",
      arguments: { project_id: projectId },
    });
    if (analysis.isError) {
      failureCode = ["response_too_large", "unavailable", "not_found"].find(
        (code) => code === toolErrorCode(analysis)
      );
      assert.equal(toolErrorCode(analysis), "response_too_large");
    } else {
      assert.equal(analysis.structuredContent?.source?.id, projectId);
      assert.ok(Array.isArray(analysis.structuredContent?.facts?.materials));
      assert.equal(
        analysis.structuredContent.facts.materials.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
        analysis.structuredContent.facts.material_item_count
      );
    }
    failureCode = undefined;
    if (process.env.TRACKDRAW_MCP_COMPARE_PROJECT_ID) {
      stage = "track comparison";
      const compared = await client.callTool({
        name: "compare_tracks",
        arguments: {
          left_project_id: projectId,
          right_project_id: process.env.TRACKDRAW_MCP_COMPARE_PROJECT_ID,
        },
      });
      assert.notEqual(compared.isError, true);
      assert.equal(
        compared.structuredContent?.differences?.direction,
        "right_minus_left"
      );
    }
    for (const name of ["get_overlay", "get_viewer_snapshot"]) {
      stage = name;
      failureCode = undefined;
      const derived = await client.callTool({
        name,
        arguments: { project_id: projectId },
      });
      if (derived.isError) {
        failureCode = ["response_too_large", "unavailable", "not_found"].find(
          (code) => code === toolErrorCode(derived)
        );
        assert.equal(toolErrorCode(derived), "response_too_large");
      } else assert.equal(derived.structuredContent?.source?.id, projectId);
    }
  }
  failureCode = undefined;
  if (checkRevocation) {
    stage = "token lifecycle";
    const info = await discoverOAuthServerInfo(endpoint);
    const metadata = info.authorizationServerMetadata;
    assert.ok(tokens?.refresh_token);
    const oldRefresh = tokens.refresh_token;
    stage = "refresh rotation";
    const next = await refreshAuthorization(info.authorizationServerUrl, {
      metadata,
      clientInformation: registration,
      refreshToken: oldRefresh,
      resource: endpoint,
    });
    assert.ok(next.refresh_token);
    assert.notEqual(next.refresh_token, oldRefresh);
    tokens = { ...next, issuer: registration.issuer };
    stage = "refreshed access";
    await client.listTools();
    const revocationEndpoint = new URL(metadata.revocation_endpoint);
    assert.equal(revocationEndpoint.origin, endpoint.origin);
    stage = "revocation";
    const revoked = await fetch(revocationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: registration.client_id,
        token: tokens.refresh_token,
        token_type_hint: "refresh_token",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(revoked.status, 200);
    await revoked.body?.cancel();
    // Raw probe deliberately avoids the SDK's automatic reauthorization path.
    stage = "revoked access rejection";
    const rejected = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(rejected.status, 401);
    await rejected.body?.cancel();
    console.log(
      "Token lifecycle passed: refresh rotation, refreshed access and revocation."
    );
  }
  console.log(
    "MCP OAuth smoke passed: authorization, account/catalog discovery and available owned-project workflows."
  );
} catch (error) {
  // Numeric protocol/HTTP codes are useful without exposing SDK error payloads.
  const status = Number.isInteger(error?.code) ? ` code=${error.code}` : "";
  // Do not dump SDK errors, callbacks or token responses into logs.
  console.error(
    `MCP OAuth smoke failed during ${stage}${status}${failureCode ? ` (${failureCode})` : ""}. Check the endpoint, consent and privacy-safe server status logs.`
  );
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await client.close();
  server.close();
  tokens = undefined;
  verifier = undefined;
}
