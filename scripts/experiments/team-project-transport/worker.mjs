// Disposable local experiment. Never exported by TrackDraw's production Worker.
import { DurableObject } from "cloudflare:workers";
import { getDatabase, measurements, meter } from "./context.mjs";
import { readTeamProject, createTeamProject } from "@/lib/server/team-projects";
import { pollTeamProject } from "@/lib/server/team-project-poll";
import {
  acquireProjectLease,
  renewProjectLease,
  releaseProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
import { projectAuthorizationPredicate } from "@/lib/server/project-authorization";
import { createDefaultDesign } from "@/lib/track/design";

// One projected query, with the existing authorization predicate. No design_json.
async function status(userId, projectId) {
  const db = await getDatabase();
  const access = projectAuthorizationPredicate(
    { userId, scope: { kind: "team", teamId: "club" } },
    "read"
  );
  const row = await db
    .prepare(
      `SELECT revision,
    (SELECT json_object('userId',l.user_id,'name',u.name,'expiresAt',l.expires_at)
     FROM project_edit_leases l JOIN users u ON u.id=l.user_id
     WHERE l.project_id=projects.id AND l.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
     AND EXISTS(SELECT 1 FROM team_members m WHERE m.organizationId=projects.owner_team_id
       AND m.userId=l.user_id AND m.role IN ('owner','editor'))) AS editing
    FROM projects WHERE id=? AND archived_at IS NULL AND ${access.sql}`
    )
    .bind(projectId, ...access.bindings)
    .first();
  if (!row) throw new Error("not_found");
  return {
    revision: row.revision,
    editing: row.editing ? JSON.parse(row.editing) : null,
  };
}

export class ProjectRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.generation = crypto.randomUUID();
  }
  async fetch(request) {
    // The outer Worker authorizes this synthetic actor before upgrading.
    const url = new URL(request.url);
    const pair = new WebSocketPair();
    pair[1].serializeAttachment({
      userId: url.searchParams.get("user"),
      projectId: url.searchParams.get("project"),
    });
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(socket, message) {
    const metrics = meter();
    await measurements.run(metrics, async () => {
      try {
        if (message !== "check") throw new Error("invalid_message");
        const { userId, projectId } = socket.deserializeAttachment();
        const value = await status(userId, projectId);
        socket.send(
          JSON.stringify({ value, metrics, generation: this.generation })
        );
      } catch {
        socket.send(JSON.stringify({ error: "not_found", metrics }));
        socket.close(1008, "Access unavailable");
      }
    });
  }

  async notify() {
    const metrics = meter();
    return measurements.run(metrics, async () => {
      // Count authorization work on fan-out; attachments are not perpetual grants.
      for (const socket of this.ctx.getWebSockets()) {
        const { userId, projectId } = socket.deserializeAttachment();
        try {
          socket.send(
            JSON.stringify({
              value: await status(userId, projectId),
              hint: true,
            })
          );
        } catch {
          socket.send(JSON.stringify({ error: "not_found", hint: true }));
          socket.close(1008, "Access unavailable");
        }
      }
      return metrics;
    });
  }

  webSocketClose(socket, code, reason) {
    socket.close(code, reason);
  }
}

const worker = {
  async fetch(request, env) {
    const metrics = meter();
    const url = new URL(request.url);
    const input =
      request.method === "POST"
        ? await request.json()
        : Object.fromEntries(url.searchParams);
    try {
      return await measurements.run(metrics, async () => {
        const project = input.project;
        const user = input.user ?? "owner";
        const room = () => env.ROOM.getByName(project);
        let value;
        switch (url.pathname) {
          case "/seed": {
            const db = await getDatabase();
            for (const [id, role] of [
              ["owner", "owner"],
              ["viewer", "viewer"],
              ["outsider", null],
            ]) {
              await db
                .prepare(
                  "INSERT OR IGNORE INTO users(id,name,email,createdAt,updatedAt) VALUES(?,?,?,?,?)"
                )
                .bind(id, id, `${id}@example.invalid`, "2026", "2026")
                .run();
              if (id === "owner")
                await db
                  .prepare(
                    "INSERT OR IGNORE INTO teams(id,name,slug,createdAt) VALUES('club','Club','club','2026')"
                  )
                  .run();
              if (role)
                await db
                  .prepare(
                    "INSERT OR IGNORE INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)"
                  )
                  .bind(id, "club", id, role, "2026")
                  .run();
            }
            const created = await createTeamProject(
              "owner",
              "club",
              "Transport fixture"
            );
            const design = createDefaultDesign();
            design.id = created.project.id;
            design.shapeOrder = [];
            design.shapeById = {};
            for (let i = 0; i < Number(input.shapes); i++) {
              const id = `gate-${i}`;
              design.shapeOrder.push(id);
              design.shapeById[id] = {
                id,
                kind: "gate",
                x: i % 50,
                y: Math.floor(i / 50),
                rotation: 0,
                width: 2,
                height: 2,
              };
            }
            const acquired = await acquireProjectLease(
              "owner",
              "club",
              design.id
            );
            const saved = await saveTeamProject(
              "owner",
              "club",
              design.id,
              acquired.lease.sessionId,
              acquired.project.revision,
              design
            );
            value = {
              project: design.id,
              design,
              lease: acquired.lease,
              revision: saved.revision,
            };
            break;
          }
          case "/full":
            value = await readTeamProject(user, "club", project);
            break;
          case "/status":
            value = await status(user, project);
            break;
          case "/conditional":
            value = await pollTeamProject(
              user,
              "club",
              project,
              input.revision
            );
            break;
          case "/poll": {
            const summary = await status(user, project);
            value = {
              ...summary,
              full:
                summary.revision !== input.revision
                  ? await readTeamProject(user, "club", project)
                  : null,
            };
            break;
          }
          case "/renew":
            value = await renewProjectLease(
              user,
              "club",
              project,
              input.sessionId
            );
            break;
          case "/save": {
            value = await saveTeamProject(
              user,
              "club",
              project,
              input.sessionId,
              input.revision,
              input.design
            );
            if (input.notify) {
              metrics.doCalls++;
              const other = await room().notify();
              for (const key of [
                "statements",
                "rowsRead",
                "rowsWritten",
                "bindingBytes",
              ])
                metrics[key] += other[key];
            }
            break;
          }
          case "/acquire":
            value = await acquireProjectLease(user, "club", project);
            break;
          case "/release":
            value = await releaseProjectLease(user, project, input.sessionId);
            break;
          case "/notify": {
            metrics.doCalls++;
            const other = await room().notify();
            for (const key of [
              "statements",
              "rowsRead",
              "rowsWritten",
              "bindingBytes",
            ])
              metrics[key] += other[key];
            value = { notified: true };
            break;
          }
          case "/connect": {
            await status(user, project);
            metrics.doCalls++;
            const response = await room().fetch(
              new Request(request.url, { headers: { Upgrade: "websocket" } })
            );
            return new Response(null, {
              status: response.status,
              webSocket: response.webSocket,
              headers: { "x-experiment-metrics": JSON.stringify(metrics) },
            });
          }
          default:
            return Response.json({ error: "unknown_route" }, { status: 404 });
        }
        return Response.json({ value, metrics });
      });
    } catch (error) {
      return Response.json(
        { error: error.code ?? error.message, metrics },
        { status: 409 }
      );
    }
  },
};
export default worker;
