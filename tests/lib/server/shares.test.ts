import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type { SerializedTrackDesign } from "@/lib/types";

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

import { createShare } from "@/lib/server/shares";

type Statement = {
  sql: string;
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

function createStatement(result?: {
  first?: unknown;
  run?: unknown;
}): Statement {
  const statement = {
    sql: "",
    bind: vi.fn(() => statement),
    first: vi.fn(async () => result?.first ?? null),
    run: vi.fn(async () => result?.run ?? {}),
  };

  return statement;
}

function installStatements(statements: Statement[]) {
  mocks.prepare.mockImplementation((sql: string) => {
    const statement = statements.shift();
    if (!statement) {
      throw new Error(`Unexpected SQL: ${sql}`);
    }

    statement.sql = sql;
    return statement;
  });
}

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
