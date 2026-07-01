import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type { SerializedTrackDesign } from "@/lib/types";
import {
  createD1AllStatement,
  createD1Statement as createStatement,
  installD1Statements,
  type MockD1Statement,
} from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  createUnlistedGalleryEntry: vi.fn(),
  deleteGalleryEntry: vi.fn(),
  getGalleryEntryByShareToken: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

vi.mock("@/lib/server/gallery", () => ({
  createUnlistedGalleryEntry: mocks.createUnlistedGalleryEntry,
  deleteGalleryEntry: mocks.deleteGalleryEntry,
  getGalleryEntryByShareToken: mocks.getGalleryEntryByShareToken,
  parseGalleryState: (value: string | null | undefined) => {
    if (
      value === "listed" ||
      value === "featured" ||
      value === "hidden" ||
      value === "unlisted"
    ) {
      return value;
    }
    return "unlisted";
  },
}));

import {
  createShare,
  deleteSharesOwnedByUser,
  getSharesByUserId,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";

afterEach(() => {
  vi.useRealTimers();
});

function installStatements(statements: MockD1Statement[]) {
  installD1Statements(mocks.prepare, statements);
}

type ShareRowFixture = {
  id: string;
  token: string;
  design_json: string;
  title: string;
  description: string;
  field_width: number;
  field_height: number;
  shape_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  owner_user_id: string | null;
  project_id: string | null;
  share_type: string;
};

function existingShareRow(serialized: SerializedTrackDesign) {
  return {
    id: "share-id-1",
    token: "existing-token",
    design_json: JSON.stringify(serialized),
    title: "Old title",
    description: "Old description",
    field_width: 30,
    field_height: 20,
    shape_count: 0,
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    published_at: "2026-04-20T10:00:00.000Z",
    expires_at: null,
    revoked_at: null,
    owner_user_id: "user-1",
    project_id: "project-1",
    share_type: "published",
  };
}

function shareRow(overrides: Partial<ShareRowFixture> = {}): ShareRowFixture {
  return {
    ...baseShareRow(),
    ...overrides,
  };
}

function baseShareRow(): ShareRowFixture {
  return {
    id: "share-id-x",
    token: "tok-x",
    design_json: JSON.stringify({}),
    title: "Test share",
    description: "",
    field_width: 40,
    field_height: 20,
    shape_count: 3,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-04-25T12:00:00.000Z",
    published_at: null,
    expires_at: null,
    revoked_at: null,
    owner_user_id: "user-1",
    project_id: null,
    share_type: "published",
  };
}

describe("resolveStoredShare", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    mocks.prepare.mockReset();
  });

  it("returns missing when no share row exists", async () => {
    installStatements([createStatement({ first: null })]);
    const result = await resolveStoredShare("unknown-token");
    expect(result.status).toBe("missing");
  });

  it("returns revoked when share has a revoked_at timestamp", async () => {
    installStatements([
      createStatement({
        first: shareRow({ revoked_at: "2026-04-01T00:00:00.000Z" }),
      }),
    ]);
    const result = await resolveStoredShare("tok-x");
    expect(result.status).toBe("revoked");
  });

  it("returns expired when share expires_at is in the past", async () => {
    installStatements([
      createStatement({
        first: shareRow({ expires_at: "2026-03-01T00:00:00.000Z" }),
      }),
    ]);
    const result = await resolveStoredShare("tok-x");
    expect(result.status).toBe("expired");
  });

  it("returns available when share exists and is within its expiry", async () => {
    installStatements([
      createStatement({
        first: shareRow({ expires_at: "2026-12-31T00:00:00.000Z" }),
      }),
    ]);
    const result = await resolveStoredShare("tok-x");
    expect(result.status).toBe("available");
  });

  it("returns available for a published share with no expiry", async () => {
    installStatements([createStatement({ first: shareRow() })]);
    const result = await resolveStoredShare("tok-x");
    expect(result.status).toBe("available");
  });
});

describe("revokeShare", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    mocks.prepare.mockReset();
    mocks.deleteGalleryEntry.mockReset();
  });

  it("executes an UPDATE query and deletes the gallery entry", async () => {
    const stmt = createStatement();
    installStatements([stmt]);

    await revokeShare("tok-revoke");

    expect(stmt.run).toHaveBeenCalledOnce();
    expect(stmt.bind).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "tok-revoke"
    );
    expect(mocks.deleteGalleryEntry).toHaveBeenCalledWith("tok-revoke");
  });
});

describe("deleteSharesOwnedByUser", () => {
  beforeEach(() => {
    mocks.prepare.mockReset();
    mocks.deleteGalleryEntry.mockReset();
  });

  it("does nothing when the user owns no shares", async () => {
    const selectStmt = createD1AllStatement([]);
    installStatements([selectStmt]);

    await deleteSharesOwnedByUser("user-1");

    expect(mocks.deleteGalleryEntry).not.toHaveBeenCalled();
  });

  it("deletes the gallery entry and share row for every owned share", async () => {
    const selectStmt = createD1AllStatement([
      { token: "tok-a" },
      { token: "tok-b" },
    ]);
    const deleteA = createStatement();
    const deleteB = createStatement();
    installStatements([selectStmt, deleteA, deleteB]);

    await deleteSharesOwnedByUser("user-1");

    expect(selectStmt.bind).toHaveBeenCalledWith("user-1");
    expect(mocks.deleteGalleryEntry).toHaveBeenNthCalledWith(1, "tok-a");
    expect(deleteA.bind).toHaveBeenCalledWith("tok-a");
    expect(deleteA.run).toHaveBeenCalledOnce();
    expect(mocks.deleteGalleryEntry).toHaveBeenNthCalledWith(2, "tok-b");
    expect(deleteB.bind).toHaveBeenCalledWith("tok-b");
    expect(deleteB.run).toHaveBeenCalledOnce();
  });
});

describe("getSharesByUserId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    mocks.prepare.mockReset();
  });

  it("returns an empty list when no shares exist for the user", async () => {
    const stmt = createD1AllStatement([]);
    mocks.prepare.mockReturnValue(stmt);

    const result = await getSharesByUserId("user-1");
    expect(result).toEqual([]);
  });

  it("returns mapped user shares", async () => {
    const row = {
      token: "tok-user",
      title: "My share",
      shape_count: 4,
      created_at: "2026-04-01T00:00:00.000Z",
      expires_at: null,
      project_id: "proj-1",
      share_type: "published",
      gallery_state: "listed",
      gallery_title: "Gallery Title",
      gallery_description: "Gallery desc",
    };
    const stmt = createD1AllStatement([row]);
    mocks.prepare.mockReturnValue(stmt);

    const result = await getSharesByUserId("user-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      token: "tok-user",
      shapeCount: 4,
      projectId: "proj-1",
      shareType: "published",
      galleryState: "listed",
    });
  });
});

describe("share server helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    mocks.prepare.mockReset();
    mocks.createUnlistedGalleryEntry.mockReset();
    mocks.deleteGalleryEntry.mockReset();
    mocks.getGalleryEntryByShareToken.mockReset();
  });

  it("creates anonymous shares as temporary links with an expiry", async () => {
    const insertStatement = createStatement();
    installStatements([insertStatement]);

    const share = await createShare(createDefaultDesign(), {
      expiresInDays: 7,
    });

    const bindArgs = insertStatement.bind.mock.calls[0];

    expect(share.shareType).toBe("temporary");
    expect(share.ownerUserId).toBeNull();
    expect(share.projectId).toBeNull();
    expect(share.expiresAt).toBe("2026-05-02T12:00:00.000Z");
    expect(insertStatement.sql).toContain("share_type");
    expect(bindArgs.at(-3)).toBeNull();
    expect(bindArgs.at(-2)).toBeNull();
    expect(bindArgs.at(-1)).toBe("temporary");
    expect(mocks.createUnlistedGalleryEntry).not.toHaveBeenCalled();
  });

  it("creates account shares as published links without expiry", async () => {
    const insertStatement = createStatement();
    installStatements([insertStatement]);

    const share = await createShare(createDefaultDesign(), {
      ownerUserId: "user-1",
    });

    const bindArgs = insertStatement.bind.mock.calls[0];

    expect(share.shareType).toBe("published");
    expect(share.ownerUserId).toBe("user-1");
    expect(share.expiresAt).toBeNull();
    expect(bindArgs.at(-3)).toBe("user-1");
    expect(bindArgs.at(-2)).toBeNull();
    expect(bindArgs.at(-1)).toBe("published");
    expect(mocks.createUnlistedGalleryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        shareToken: share.token,
        ownerUserId: "user-1",
      })
    );
  });

  it("updates and reuses the active published share for an account project", async () => {
    const design = createDefaultDesign();
    design.title = "Updated project track";
    const selectStatement = createStatement({
      first: existingShareRow(serializeDesign(createDefaultDesign())),
    });
    const updateStatement = createStatement();
    installStatements([selectStatement, updateStatement]);
    mocks.getGalleryEntryByShareToken.mockResolvedValue({
      id: "entry-1",
      shareToken: "existing-token",
      ownerUserId: "user-1",
      galleryState: "unlisted",
    });

    const share = await createShare(design, {
      ownerUserId: "user-1",
      projectId: "project-1",
    });

    expect(selectStatement.sql).toContain("share_type = 'published'");
    expect(selectStatement.sql).toContain("revoked_at is null");
    expect(updateStatement.sql).toContain("update shares");
    expect(updateStatement.sql).toContain("expires_at = null");
    expect(updateStatement.bind).toHaveBeenCalledWith(
      expect.any(String),
      "Updated project track",
      expect.any(String),
      design.field.width,
      design.field.height,
      0,
      "2026-04-25T12:00:00.000Z",
      "share-id-1"
    );
    expect(share.token).toBe("existing-token");
    expect(share.shareType).toBe("published");
    expect(share.expiresAt).toBeNull();
    expect(mocks.createUnlistedGalleryEntry).not.toHaveBeenCalled();
  });
});
