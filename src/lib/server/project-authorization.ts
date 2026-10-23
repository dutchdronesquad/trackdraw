import "server-only";

import { getDatabase } from "@/lib/server/db";

export type TeamRole = "owner" | "editor" | "viewer";
export type ProjectOwner =
  { kind: "personal"; userId: string } | { kind: "team"; teamId: string };

/** Explicit context prevents old sessions/credentials expanding to every team. */
export type ProjectActor = {
  userId: string;
  projectIds?: readonly string[];
  scope: { kind: "personal" } | { kind: "team"; teamId: string };
};

export const projectActions = [
  "list",
  "read",
  "export",
  "create",
  "update",
  "archive",
  "transfer",
  "publish",
  "revoke",
  "manage-members",
] as const;
export type ProjectAction = (typeof projectActions)[number];

const roleActions: Record<TeamRole, readonly ProjectAction[]> = {
  owner: projectActions,
  editor: ["list", "read", "export", "create", "update", "archive"],
  viewer: ["list", "read", "export"],
};

export function teamRoleAllows(role: TeamRole, action: ProjectAction) {
  return roleActions[role].includes(action);
}

function rolesFor(action: ProjectAction): TeamRole[] {
  return (["owner", "editor", "viewer"] as const).filter((role) =>
    teamRoleAllows(role, action)
  );
}

/** Embed in the same statement as a mutation; never check then write unchecked. */
export function projectAuthorizationPredicate(
  actor: ProjectActor,
  action: ProjectAction
) {
  const selection = actor.projectIds
    ? " AND projects.id IN (SELECT value FROM json_each(?))"
    : "";
  const selectedBindings = actor.projectIds
    ? [JSON.stringify(actor.projectIds)]
    : [];
  if (actor.scope.kind === "personal") {
    return {
      sql: "owner_user_id = ? AND owner_team_id IS NULL" + selection,
      bindings: [actor.userId, ...selectedBindings],
    };
  }
  const roles = rolesFor(action);
  const writable = !["list", "read", "export"].includes(action);
  return {
    sql: `owner_user_id IS NULL AND owner_team_id = ? AND EXISTS (
      SELECT 1 FROM team_members
      WHERE organizationId = projects.owner_team_id AND userId = ?
        AND role IN (${roles.map(() => "?").join(", ")})
    )${writable ? " AND NOT EXISTS (SELECT 1 FROM team_succession_cases c WHERE c.team_id=projects.owner_team_id AND c.state='recovery')" : ""}${selection}`,
    bindings: [actor.scope.teamId, actor.userId, ...roles, ...selectedBindings],
  };
}

/** For project creation and membership management, before a project exists. */
export async function getAuthorizedTeam(
  actor: ProjectActor,
  action: ProjectAction
) {
  if (actor.scope.kind !== "team") return null;
  const db = await getDatabase();
  const roles = rolesFor(action);
  const row = await db
    .prepare(
      `
    SELECT teams.id, teams.name, team_members.role, EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.team_id=teams.id AND c.state='recovery') AS recovery FROM teams
    JOIN team_members ON team_members.organizationId = teams.id
    WHERE teams.id = ? AND team_members.userId = ?
      AND team_members.role IN (${roles.map(() => "?").join(", ")})
      ${!["list", "read", "export"].includes(action) ? "AND NOT EXISTS (SELECT 1 FROM team_succession_cases c WHERE c.team_id=teams.id AND c.state='recovery')" : ""}
  `
    )
    .bind(actor.scope.teamId, actor.userId, ...roles)
    .first<{ id: string; name: string; role: TeamRole; recovery?: boolean }>();
  if (!row) return null;
  const { recovery, ...team } = row;
  return { ...team, ...(recovery ? { recovery: true } : {}) };
}
