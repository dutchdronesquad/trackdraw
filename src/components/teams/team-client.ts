"use client";
import {
  teamErrorCodes,
  type TeamCommand,
  type TeamErrorCode,
} from "@/lib/teams";
export class TeamRequestError extends Error {
  constructor(readonly code: TeamErrorCode) {
    super(code);
  }
}
export async function teamRequest<T>({
  teamId,
  invitationId,
  command,
}: {
  teamId?: string;
  invitationId?: string;
  command?: TeamCommand;
} = {}): Promise<T> {
  const params = new URLSearchParams();
  if (teamId) params.set("teamId", teamId);
  if (invitationId) params.set("invitationId", invitationId);
  const response = await fetch(`/api/teams${params.size ? `?${params}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...(command
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        }
      : {}),
  });
  const body = await response.json();
  if (!response.ok || !body.ok)
    throw new TeamRequestError(
      teamErrorCodes.includes(body.code) ? body.code : "failed"
    );
  return body as T;
}
