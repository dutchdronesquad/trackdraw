"use client";
import type { TeamProjectCommand } from "@/lib/team-projects";
export class TeamProjectRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
export async function teamProjectRequest<T>(
  params: Record<string, string> = {},
  command?: TeamProjectCommand,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(
    `/api/team-projects?${new URLSearchParams(params)}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      signal,
      ...(command
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          }
        : {}),
    }
  );
  const body = await response.json();
  if (!response.ok || !body.ok)
    throw new TeamProjectRequestError(body.code ?? "failed");
  return body as T;
}

export async function teamEditingRequest<T>(
  command: import("@/lib/team-projects").TeamEditingCommand,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch("/api/team-projects/editing", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12_000)])
      : AbortSignal.timeout(12_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const body = await response.json();
  if (!response.ok || !body.ok)
    throw new TeamProjectRequestError(body.code ?? "failed");
  return body as T;
}
