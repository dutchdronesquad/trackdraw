import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const folder = await mkdtemp(join(tmpdir(), "trackdraw-transport-"));
const output = process.argv[2];
const keys = [
  "statements",
  "rowsRead",
  "rowsWritten",
  "bindingBytes",
  "doCalls",
];
const totals = () =>
  Object.fromEntries(
    [
      ...keys,
      "httpRequests",
      "wsIncoming",
      "wsOutgoing",
      "responseBytes",
      "fullReads",
    ].map((k) => [k, 0])
  );
const bytes = (value) => Buffer.byteLength(JSON.stringify(value));
const results = [];
let runtime;

try {
  const bundled = await build({
    entryPoints: [
      join(root, "scripts/experiments/team-project-transport/worker.mjs"),
    ],
    absWorkingDir: root,
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    external: ["cloudflare:workers", "node:async_hooks"],
    plugins: [
      {
        name: "local-service-boundaries",
        setup(builder) {
          builder.onResolve({ filter: /^server-only$/ }, () => ({
            path: "empty",
            namespace: "empty",
          }));
          builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({
            contents: "",
          }));
          builder.onLoad({ filter: /src\/lib\/server\/db\.ts$/ }, () => ({
            contents: `export { getDatabase } from ${JSON.stringify(join(root, "scripts/experiments/team-project-transport/context.mjs"))};`,
            loader: "js",
          }));
        },
      },
    ],
  });
  runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: "transport-experiment",
      modules: true,
      script: bundled.outputFiles[0].text,
      compatibilityDate: "2026-03-27",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: { DB: "disposable-transport-db" },
      durableObjects: { ROOM: { className: "ProjectRoom", useSQLite: true } },
      d1Persist: join(folder, "d1"),
      durableObjectsPersist: join(folder, "do"),
    })
  );
  // Reconstruct the final migrated schema, including indexes and lease triggers.
  // Migrations execute transactionally in Node SQLite exactly as in repo tests.
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  try {
    for (const name of (await readdir(join(root, "migrations")))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      sqlite.exec("BEGIN");
      sqlite.exec(await readFile(join(root, "migrations", name), "utf8"));
      sqlite.exec("COMMIT");
    }
    const db = await runtime.getD1Database("DB");
    const schema = sqlite
      .prepare(
        "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END"
      )
      .all();
    for (let i = 0; i < schema.length; i += 40)
      await db.batch(schema.slice(i, i + 40).map(({ sql }) => db.prepare(sql)));
  } finally {
    sqlite.close();
  }

  async function request(path, input, tally) {
    const started = performance.now();
    const response = await runtime.dispatchFetch(`http://experiment${path}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const body = await response.json();
    if (tally) {
      tally.httpRequests++;
      for (const key of keys) tally[key] += body.metrics[key];
      tally.responseBytes += bytes(body.value ?? body.error);
      tally.latencies.push(performance.now() - started);
      if (path === "/full") tally.fullReads++;
    }
    return { ...body, status: response.status };
  }

  async function connect(project, tally, user = "viewer") {
    const response = await runtime.dispatchFetch(
      `http://experiment/connect?project=${project}&user=${user}`,
      { headers: { Upgrade: "websocket" } }
    );
    if (response.status !== 101)
      throw new Error(`Upgrade failed: ${await response.text()}`);
    tally.httpRequests++;
    const metrics = JSON.parse(response.headers.get("x-experiment-metrics"));
    for (const key of keys) tally[key] += metrics[key];
    const socket = response.webSocket;
    socket.accept();
    const queue = [];
    const waiters = [];
    socket.addEventListener("message", (event) => {
      const packet = JSON.parse(event.data);
      tally.wsOutgoing++;
      tally.responseBytes += bytes(packet.value ?? packet.error);
      if (packet.metrics)
        for (const key of keys) tally[key] += packet.metrics[key];
      if (waiters.length) waiters.shift()(packet);
      else queue.push(packet);
    });
    return {
      socket,
      next() {
        if (queue.length) return Promise.resolve(queue.shift());
        return new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("WebSocket response timeout")),
            5000
          );
          waiters.push((value) => {
            clearTimeout(timer);
            resolve(value);
          });
        });
      },
      async check() {
        tally.wsIncoming++;
        socket.send("check");
        return this.next();
      },
    };
  }

  const ticks = 30,
    viewers = 4;
  for (const shapes of [20, 500])
    for (const profile of ["idle", "sparse", "busy"])
      for (const variant of [
        "current",
        "light-poll",
        "conditional-poll",
        "durable-object",
      ]) {
        const seeded = (await request("/seed", { shapes })).value;
        const { project, lease, design } = seeded;
        let revision = seeded.revision;
        const tally = { ...totals(), latencies: [] };
        const clients = [];
        for (let i = 0; i < viewers; i++) {
          const initial = await request(
            "/full",
            { project, user: "viewer" },
            tally
          );
          assert.equal(initial.value.project.revision, revision);
          clients.push({
            revision,
            connection:
              variant === "durable-object"
                ? await connect(project, tally)
                : null,
          });
        }
        for (let tick = 1; tick <= ticks; tick++) {
          assert.equal(
            (
              await request(
                "/renew",
                { project, sessionId: lease.sessionId },
                tally
              )
            ).status,
            200
          );
          const changed =
            profile === "busy" || (profile === "sparse" && tick % 5 === 0);
          if (changed) {
            design.title = `Revision ${tick}`;
            const saved = await request(
              "/save",
              {
                project,
                sessionId: lease.sessionId,
                revision,
                design,
                notify: variant === "durable-object",
              },
              tally
            );
            assert.equal(saved.status, 200);
            revision = saved.value.revision;
            if (variant === "durable-object") {
              for (const client of clients) {
                const hint = await client.connection.next();
                assert.equal(hint.value.revision, revision);
                const full = await request(
                  "/full",
                  { project, user: "viewer" },
                  tally
                );
                client.revision = full.value.project.revision;
              }
            }
          }
          for (const client of clients) {
            if (variant === "current") {
              const full = await request(
                "/full",
                { project, user: "viewer" },
                tally
              );
              client.revision = full.value.project.revision;
            } else {
              const status =
                variant === "light-poll" || variant === "conditional-poll"
                  ? await request(
                      variant === "conditional-poll" ? "/conditional" : "/poll",
                      { project, user: "viewer", revision: client.revision },
                      tally
                    )
                  : await client.connection.check();
              assert.equal(status.value.revision, revision);
              if (client.revision !== status.value.revision) {
                if (status.value.project) {
                  tally.fullReads++;
                  client.revision = status.value.project.revision;
                } else if (status.value.full) {
                  tally.fullReads++;
                  client.revision = status.value.full.project.revision;
                } else {
                  const full = await request(
                    "/full",
                    { project, user: "viewer" },
                    tally
                  );
                  client.revision = full.value.project.revision;
                }
              }
            }
            assert.equal(client.revision, revision);
          }
        }
        for (const client of clients)
          client.connection?.socket.close(1000, "Finished");
        const latencies = tally.latencies.sort((a, b) => a - b);
        delete tally.latencies;
        results.push({
          shapes,
          profile,
          variant,
          logicalSeconds: ticks * 20,
          viewers,
          ...tally,
          localHttpWallMsP50: Number(
            latencies[Math.floor(latencies.length * 0.5)].toFixed(2)
          ),
          localHttpWallMsP95: Number(
            latencies[Math.floor(latencies.length * 0.95)].toFixed(2)
          ),
        });
      }

  // Safety checks exercise the real D1 services and the experimental socket path.
  const seed = (await request("/seed", { shapes: 20 })).value;
  const { project, lease, design } = seed;
  const full = (await request("/full", { project, user: "viewer" })).value;
  const summary = (await request("/status", { project, user: "viewer" })).value;
  assert.deepEqual(summary, {
    revision: full.project.revision,
    editing: full.editing,
  });
  assert.equal(JSON.stringify(summary).includes(lease.sessionId), false);
  assert.equal(
    (await request("/acquire", { project })).error,
    "lease_unavailable"
  );
  assert.equal(
    (
      await request("/save", {
        project,
        sessionId: lease.sessionId,
        revision: seed.revision - 1,
        design,
      })
    ).error,
    "conflict"
  );
  assert.equal(
    (await request("/status", { project, user: "outsider" })).error,
    "not_found"
  );
  const safety = { ...totals(), latencies: [] };
  const connection = await connect(project, safety);
  const saved = await request("/save", {
    project,
    sessionId: lease.sessionId,
    revision: seed.revision,
    design,
  });
  // Intentionally omit notify: reconciliation must discover the committed revision.
  assert.equal((await connection.check()).value.revision, saved.value.revision);
  connection.socket.close(1000, "Reconnect");
  const reconnected = await connect(project, safety);
  const beforeEviction = await reconnected.check();
  assert.equal(beforeEviction.value.revision, saved.value.revision);
  await runtime.unsafeEvictDurableObject(
    "transport-experiment",
    "ProjectRoom",
    { name: project, webSockets: "hibernate" }
  );
  const afterEviction = await reconnected.check();
  assert.notEqual(afterEviction.generation, beforeEviction.generation);
  assert.equal(afterEviction.value.revision, saved.value.revision);
  const db = await runtime.getD1Database("DB");
  await db
    .prepare(
      "DELETE FROM team_members WHERE organizationId='club' AND userId='viewer'"
    )
    .run();
  assert.equal((await reconnected.check()).error, "not_found");
  assert.equal(
    (await request("/full", { project, user: "viewer" })).error,
    "not_found"
  );
  await db
    .prepare(
      "UPDATE project_edit_leases SET expires_at='2000-01-01T00:00:00.000Z' WHERE project_id=?"
    )
    .bind(project)
    .run();
  assert.equal(
    (await request("/renew", { project, sessionId: lease.sessionId })).error,
    "lease_lost"
  );
  const successor = (await request("/acquire", { project })).value;
  await request("/release", { project, sessionId: lease.sessionId });
  assert.equal(
    (await request("/renew", { project, sessionId: successor.lease.sessionId }))
      .status,
    200
  );
  assert.equal(
    (
      await request("/save", {
        project,
        sessionId: lease.sessionId,
        revision: saved.value.revision,
        design,
      })
    ).error,
    "lease_lost"
  );
  const ownerConnection = await connect(project, safety, "owner");
  await assert.rejects(
    db
      .prepare("UPDATE projects SET archived_at='2026-11-02' WHERE id=?")
      .bind(project)
      .run(),
    /project_edit_session_active/
  );
  await request("/release", { project, sessionId: successor.lease.sessionId });
  await db
    .prepare("UPDATE projects SET archived_at='2026-11-02' WHERE id=?")
    .bind(project)
    .run();
  assert.equal((await ownerConnection.check()).error, "not_found");

  const packages = {};
  for (const name of ["miniflare", "workerd", "esbuild"])
    packages[name] = JSON.parse(
      await readFile(join(root, "node_modules", name, "package.json"), "utf8")
    ).version;
  const sourceHashes = {};
  for (const path of [
    "src/lib/server/team-projects.ts",
    "src/lib/server/team-project-leases.ts",
    "src/lib/server/projects.ts",
    "src/lib/server/team-project-poll.ts",
    "scripts/experiments/team-project-transport/context.mjs",
    "scripts/experiments/team-project-transport/worker.mjs",
    "scripts/experiments/team-project-transport/compare.mjs",
  ])
    sourceHashes[path] = createHash("sha256")
      .update(await readFile(join(root, path)))
      .digest("hex");

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    packages,
    sourceHashes,
    scope:
      "Local workerd/Miniflare service comparison; compressed logical time; synthetic actors, no Better Auth/Next/browser stack; no hosted CPU, hibernation-duration or billing measurement.",
    safetyChecks: [
      "status agrees with full read without session secret",
      "exclusive lease",
      "stale revision rejected",
      "outsider denied",
      "missed hint reconciliation",
      "reconnect reconciliation",
      "forced hibernation restores socket attachment in a new instance",
      "membership removal denies socket and full read",
      "expired lease denied",
      "late release preserves successor",
      "old save after takeover denied",
      "archival rejected during active editing",
      "archived project denies socket",
    ],
    results,
  };
  if (output)
    await writeFile(resolve(output), JSON.stringify(report, null, 2) + "\n");
  console.table(
    results.map(
      ({
        shapes,
        profile,
        variant,
        httpRequests,
        wsIncoming,
        statements,
        rowsRead,
        rowsWritten,
        responseBytes,
        fullReads,
      }) => ({
        shapes,
        profile,
        variant,
        httpRequests,
        wsIncoming,
        statements,
        rowsRead,
        rowsWritten,
        responseBytes,
        fullReads,
      })
    )
  );
  console.log(`Safety checks passed: ${report.safetyChecks.join(", ")}`);
} finally {
  await runtime?.dispose();
  await rm(folder, { recursive: true, force: true });
}
