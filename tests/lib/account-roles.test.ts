import { describe, expect, it } from "vitest";
import {
  accountRoles,
  getAccountRoleLabel,
  isAccountRole,
  parseAccountRole,
} from "@/lib/account-roles";

describe("account role helpers", () => {
  it("exposes the supported role list in a stable order", () => {
    expect(accountRoles).toEqual(["user", "moderator", "admin"]);
  });

  it("recognizes valid account roles", () => {
    expect(isAccountRole("user")).toBe(true);
    expect(isAccountRole("moderator")).toBe(true);
    expect(isAccountRole("admin")).toBe(true);
    expect(isAccountRole("owner")).toBe(false);
    expect(isAccountRole(null)).toBe(false);
  });

  it("falls back to user for unknown stored role values", () => {
    expect(parseAccountRole("admin")).toBe("admin");
    expect(parseAccountRole("moderator")).toBe("moderator");
    expect(parseAccountRole("weird")).toBe("user");
    expect(parseAccountRole(undefined)).toBe("user");
  });

  it("returns human-readable labels", () => {
    expect(getAccountRoleLabel("user")).toBe("User");
    expect(getAccountRoleLabel("moderator")).toBe("Moderator");
    expect(getAccountRoleLabel("admin")).toBe("Admin");
  });
});
