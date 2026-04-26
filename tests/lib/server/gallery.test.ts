import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  deleteGalleryPreviewImage: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

vi.mock("@/lib/server/gallery-media", () => ({
  deleteGalleryPreviewImage: mocks.deleteGalleryPreviewImage,
}));

import {
  deleteGalleryEntry,
  getGalleryOverviewStats,
  listPublicGalleryEntries,
  moveGalleryEntryToFeatured,
  moveGalleryEntryToHidden,
  moveGalleryEntryToListed,
  moveGalleryEntryToUnlisted,
} from "@/lib/server/gallery";

type Statement = {
  sql: string;
  bind: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

function createStatement(result?: {
  all?: unknown;
  first?: unknown;
  run?: unknown;
}): Statement {
  const statement = {
    sql: "",
    bind: vi.fn(() => statement),
    all: vi.fn(async () => result?.all ?? { results: [] }),
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

describe("gallery server helpers", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.prepare.mockReset();
    mocks.deleteGalleryPreviewImage.mockReset();
  });

  it("queries only public, active listed and featured gallery entries", async () => {
    const statement = createStatement({
      all: {
        results: [
          {
            id: "entry-1",
            share_token: "token-1",
            owner_user_id: "user-1",
            gallery_state: "featured",
            gallery_title: "Featured track",
            gallery_description: "A featured public track.",
            gallery_preview_image: "gallery/previews/entry-1.webp",
            gallery_published_at: "2026-04-20T10:00:00.000Z",
            moderation_hidden_at: null,
            created_at: "2026-04-20T09:00:00.000Z",
            updated_at: "2026-04-20T10:00:00.000Z",
            owner_name: "Pilot One",
            share_title: "Share title",
            field_width: 30,
            field_height: "20",
            shape_count: 12,
          },
        ],
      },
    });
    installStatements([statement]);

    const entries = await listPublicGalleryEntries(500);

    expect(statement.sql).toContain(
      "g.gallery_state in ('listed', 'featured')"
    );
    expect(statement.sql).toContain("s.revoked_at is null");
    expect(statement.sql).toContain(
      "(s.expires_at is null or datetime(s.expires_at) > datetime('now'))"
    );
    expect(statement.bind).toHaveBeenCalledWith(100);
    expect(entries).toEqual([
      expect.objectContaining({
        id: "entry-1",
        galleryState: "featured",
        galleryTitle: "Featured track",
        ownerName: "Pilot One",
        fieldWidth: 30,
        fieldHeight: 20,
        shapeCount: 12,
      }),
    ]);
  });

  it("pins shares when entries become listed or featured", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    const listStatement = createStatement();
    const listShareStatement = createStatement();
    const featureStatement = createStatement();
    const featureShareStatement = createStatement();
    installStatements([
      listStatement,
      listShareStatement,
      featureStatement,
      featureShareStatement,
    ]);

    await moveGalleryEntryToListed("share-1");
    await moveGalleryEntryToFeatured("share-2");

    expect(listStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(listShareStatement.bind).toHaveBeenCalledWith(
      null,
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(featureShareStatement.bind).toHaveBeenCalledWith(
      null,
      "2026-04-25T12:00:00.000Z",
      "share-2"
    );
  });

  it("restores finite share expiry when entries are hidden or unlisted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    const hiddenStatement = createStatement();
    const hiddenShareStatement = createStatement();
    const unlistedStatement = createStatement();
    const unlistedShareStatement = createStatement();
    installStatements([
      hiddenStatement,
      hiddenShareStatement,
      unlistedStatement,
      unlistedShareStatement,
    ]);

    await moveGalleryEntryToHidden("share-1", { retentionDays: 7 });
    await moveGalleryEntryToUnlisted("share-2", { retentionDays: 30 });

    expect(hiddenStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(hiddenShareStatement.bind).toHaveBeenCalledWith(
      "2026-05-02T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(unlistedShareStatement.bind).toHaveBeenCalledWith(
      "2026-05-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-2"
    );
  });

  it("deletes the R2 preview when a gallery entry is deleted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    const entryStatement = createStatement({
      first: {
        id: "entry-1",
        share_token: "share-1",
        owner_user_id: "user-1",
        gallery_state: "listed",
        gallery_title: "Track",
        gallery_description: "A public track.",
        gallery_preview_image: "gallery/previews/entry-1.webp",
        gallery_published_at: null,
        moderation_hidden_at: null,
        created_at: "2026-04-20T09:00:00.000Z",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    });
    const deleteStatement = createStatement();
    const shareStatement = createStatement();
    installStatements([entryStatement, deleteStatement, shareStatement]);

    await deleteGalleryEntry("share-1", { retentionDays: 7 });

    expect(mocks.deleteGalleryPreviewImage).toHaveBeenCalledWith(
      "gallery/previews/entry-1.webp"
    );
    expect(deleteStatement.sql).toContain("delete from gallery_entries");
    expect(deleteStatement.bind).toHaveBeenCalledWith("share-1");
    expect(shareStatement.bind).toHaveBeenCalledWith(
      "2026-05-02T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
  });

  it("aggregates gallery overview stats by state", async () => {
    const statement = createStatement({
      all: {
        results: [
          { gallery_state: "listed", count: 3 },
          { gallery_state: "featured", count: 2 },
          { gallery_state: "hidden", count: 1 },
        ],
      },
    });
    installStatements([statement]);

    const stats = await getGalleryOverviewStats();

    expect(stats).toEqual({
      total: 6,
      listed: 3,
      featured: 2,
      hidden: 1,
      unlisted: 0,
    });
  });
});
