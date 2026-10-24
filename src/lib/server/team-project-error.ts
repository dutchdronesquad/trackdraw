import "server-only";

export class TeamProjectError extends Error {
  constructor(
    readonly code:
      "not_found" | "conflict" | "invalid" | "lease_unavailable" | "lease_lost",
    readonly status = 404
  ) {
    super(code);
  }
}
