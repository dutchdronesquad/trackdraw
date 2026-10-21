import "server-only";

import { getDatabase } from "@/lib/server/db";

export type TeamRole = "owner" | "editor" | "viewer";
export type ProjectOwner =
  { kind: "personal"; userId: string } | { kind: "team"; teamId: string };

/** Explicit context prevents old sessions/credentials expanding to every team. */
export type ProjectActor = {
  userId: string;
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
  if (actor.scope.kind === "personal") {
    return {
      sql: "owner_user_id = ? AND owner_team_id IS NULL",
      bindings: [actor.userId],
    };
  }
  const roles = rolesFor(action);
  return {
    sql: `owner_user_id IS NULL AND owner_team_id = ? AND EXISTS (
      SELECT 1 FROM team_members
      WHERE organizationId = projects.owner_team_id AND userId = ?
        AND role IN (${roles.map(() => "?").join(", ")})
    )`,
    bindings: [actor.scope.teamId, actor.userId, ...roles],
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
  return db
    .prepare(
      `
    SELECT teams.id, teams.name, team_members.role FROM teams
    JOIN team_members ON team_members.organizationId = teams.id
    WHERE teams.id = ? AND team_members.userId = ?
      AND team_members.role IN (${roles.map(() => "?").join(", ")})
  `
    )
    .bind(actor.scope.teamId, actor.userId, ...roles)
    .first<{ id: string; name: string; role: TeamRole }>();
}
