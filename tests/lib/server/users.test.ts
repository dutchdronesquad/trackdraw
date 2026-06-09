import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1AllStatement, createD1Statement } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

import {
  countUsersByRole,
  countUsersForAdmin,
  getAdminUserById,
  getUserRoleById,
  listUsersForAdmin,
  updateUserRole,
} from "@/lib/server/users";

beforeEach(() => {
  mocks.prepare.mockReset();
});

describe("getUserRoleById", () => {
  it("returns 'user' when no row matches the user id", async () => {
    mocks.prepare.mockReturnValue(createD1Statement({ first: null }));

    const role = await getUserRoleById("missing-user");
    expect(role).toBe("user");
  });

  it("returns 'admin' when the row has role='admin'", async () => {
    mocks.prepare.mockReturnValue(
      createD1Statement({ first: { role: "admin" } })
    );

    const role = await getUserRoleById("admin-user");
    expect(role).toBe("admin");
  });

  it("returns 'user' when the row has an unrecognized role value", async () => {
    mocks.prepare.mockReturnValue(
      createD1Statement({ first: { role: "superuser" } })
    );

    const role = await getUserRoleById("some-user");
    expect(role).toBe("user");
  });
});

describe("getAdminUserById", () => {
  it("returns null when no user matches", async () => {
    mocks.prepare.mockReturnValue(createD1Statement({ first: null }));

    const user = await getAdminUserById("not-found");
    expect(user).toBeNull();
  });

  it("returns a mapped admin user when the row exists", async () => {
    mocks.prepare.mockReturnValue(
      createD1Statement({
        first: {
          id: "user-1",
          name: "FPV Pilot",
          email: "pilot@trackdraw.app",
          image: null,
          role: "admin",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      })
    );

    const user = await getAdminUserById("user-1");
    expect(user).toMatchObject({
      id: "user-1",
      name: "FPV Pilot",
      email: "pilot@trackdraw.app",
      image: null,
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("maps a null role to 'user'", async () => {
    mocks.prepare.mockReturnValue(
      createD1Statement({
        first: {
          id: "user-2",
          name: null,
          email: "anon@example.com",
          image: null,
          role: null,
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      })
    );

    const user = await getAdminUserById("user-2");
    expect(user?.role).toBe("user");
  });
});

describe("listUsersForAdmin", () => {
  it("returns an empty list when there are no users", async () => {
    mocks.prepare.mockReturnValue(createD1AllStatement([]));

    const users = await listUsersForAdmin();
    expect(users).toEqual([]);
  });

  it("returns a mapped list of admin users", async () => {
    mocks.prepare.mockReturnValue(
      createD1AllStatement([
        {
          id: "u-1",
          name: "Alice",
          email: "alice@example.com",
          image: "https://example.com/alice.jpg",
          role: "admin",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: "u-2",
          name: "Bob",
          email: "bob@example.com",
          image: null,
          role: null,
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ])
    );

    const users = await listUsersForAdmin();
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({ id: "u-1", name: "Alice", role: "admin" });
    expect(users[1]).toMatchObject({ id: "u-2", name: "Bob", role: "user" });
  });
});

describe("countUsersByRole", () => {
  it("returns 0 when no users have the role", async () => {
    mocks.prepare.mockReturnValue(createD1AllStatement([]));

    const count = await countUsersByRole("admin");
    expect(count).toBe(0);
  });

  it("returns 1 when exactly one user has the role", async () => {
    mocks.prepare.mockReturnValue(createD1AllStatement([{}]));

    const count = await countUsersByRole("admin");
    expect(count).toBe(1);
  });

  it("returns 2 when at most 2 rows are returned (query uses LIMIT 2)", async () => {
    mocks.prepare.mockReturnValue(createD1AllStatement([{}, {}]));

    const count = await countUsersByRole("user");
    expect(count).toBe(2);
  });
});

describe("countUsersForAdmin", () => {
  it("returns 0 when the count row is absent", async () => {
    mocks.prepare.mockReturnValue(createD1Statement({ first: null }));
    const count = await countUsersForAdmin();
    expect(count).toBe(0);
  });

  it("returns the numeric count from the database row", async () => {
    mocks.prepare.mockReturnValue(createD1Statement({ first: { count: 42 } }));
    const count = await countUsersForAdmin();
    expect(count).toBe(42);
  });
});

describe("updateUserRole", () => {
  it("returns null when the user is not found", async () => {
    mocks.prepare.mockReturnValue(createD1Statement({ first: null }));

    const result = await updateUserRole("missing", "admin");
    expect(result).toBeNull();
  });

  it("returns the updated user when the update succeeds", async () => {
    mocks.prepare.mockReturnValue(
      createD1Statement({
        first: {
          id: "user-3",
          name: "Carol",
          email: "carol@example.com",
          image: null,
          role: "admin",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-06-09T00:00:00.000Z",
        },
      })
    );

    const result = await updateUserRole("user-3", "admin");
    expect(result).toMatchObject({
      id: "user-3",
      name: "Carol",
      role: "admin",
    });
  });
});
