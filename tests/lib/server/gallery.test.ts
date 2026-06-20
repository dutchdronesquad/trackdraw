import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createD1Statement as createStatement,
  installD1Statements,
  type MockD1Statement,
} from "../../helpers/d1";

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
  createUnlistedGalleryEntry,
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  getGalleryOverviewStats,
  listGalleryEntriesForDashboard,
  listPublicGalleryEntries,
  moveGalleryEntryToFeatured,
  moveGalleryEntryToHidden,
  moveGalleryEntryToListed,
  moveGalleryEntryToUnlisted,
  setGalleryEntryPreviewImage,
  updateGalleryEntryMetadata,
} from "@/lib/server/gallery";

function installStatements(statements: MockD1Statement[]) {
  installD1Statements(mocks.prepare, statements);
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

  it("updates only gallery state when entries become listed or featured", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    const listStatement = createStatement();
    const featureStatement = createStatement();
    installStatements([listStatement, featureStatement]);

    await moveGalleryEntryToListed("share-1");
    await moveGalleryEntryToFeatured("share-2");

    expect(listStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(featureStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-2"
    );
  });

  it("updates only gallery state when entries are hidden or unlisted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    const hiddenStatement = createStatement();
    const unlistedStatement = createStatement();
    installStatements([hiddenStatement, unlistedStatement]);

    await moveGalleryEntryToHidden("share-1");
    await moveGalleryEntryToUnlisted("share-2");

    expect(hiddenStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "2026-04-25T12:00:00.000Z",
      "share-1"
    );
    expect(unlistedStatement.bind).toHaveBeenCalledWith(
      "2026-04-25T12:00:00.000Z",
      "share-2"
    );
  });

  it("deletes the R2 preview when a gallery entry is deleted", async () => {
    const previewStatement = createStatement({
      first: { gallery_preview_image: "gallery/previews/entry-1.webp" },
    });
    const deleteStatement = createStatement();
    installStatements([previewStatement, deleteStatement]);

    await deleteGalleryEntry("share-1");

    expect(previewStatement.sql).toContain("select gallery_preview_image");
    expect(previewStatement.bind).toHaveBeenCalledWith("share-1");
    expect(mocks.deleteGalleryPreviewImage).toHaveBeenCalledWith(
      "gallery/previews/entry-1.webp"
    );
    expect(deleteStatement.sql).toContain("delete from gallery_entries");
    expect(deleteStatement.bind).toHaveBeenCalledWith("share-1");
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

  it("returns null from getGalleryEntryByShareToken when no row is found", async () => {
    installStatements([createStatement({ first: null })]);

    const result = await getGalleryEntryByShareToken("unknown-token");
    expect(result).toBeNull();
  });

  it("maps a row to a gallery entry from getGalleryEntryByShareToken", async () => {
    installStatements([
      createStatement({
        first: {
          id: "entry-x",
          share_token: "tok-x",
          owner_user_id: "owner-1",
          gallery_state: "listed",
          gallery_title: "My Layout",
          gallery_description: "Great track",
          gallery_preview_image: "/img/x.jpg",
          gallery_published_at: "2026-05-01T00:00:00.000Z",
          moderation_hidden_at: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-05-15T00:00:00.000Z",
        },
      }),
    ]);

    const entry = await getGalleryEntryByShareToken("tok-x");
    expect(entry).toMatchObject({
      id: "entry-x",
      shareToken: "tok-x",
      galleryState: "listed",
      galleryTitle: "My Layout",
      galleryDescription: "Great track",
      galleryPreviewImage: "/img/x.jpg",
    });
  });

  it("returns all rows from listGalleryEntriesForDashboard", async () => {
    const dashboardRow = {
      id: "entry-d",
      share_token: "tok-d",
      owner_user_id: "owner-2",
      gallery_state: "unlisted",
      gallery_title: "Dashboard Track",
      gallery_description: "",
      gallery_preview_image: null,
      gallery_published_at: null,
      moderation_hidden_at: null,
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-15T00:00:00.000Z",
      owner_name: "Alice",
      owner_email: "alice@example.com",
      share_title: "Dashboard Share",
      share_expires_at: null,
      share_revoked_at: null,
      field_width: "40.5",
      field_height: "20.0",
      shape_count: 12,
    };
    installStatements([createStatement({ all: { results: [dashboardRow] } })]);

    const entries = await listGalleryEntriesForDashboard();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "entry-d",
      galleryState: "unlisted",
      ownerName: "Alice",
      ownerEmail: "alice@example.com",
      fieldWidth: 40.5,
      fieldHeight: 20.0,
      shapeCount: 12,
    });
  });

  it("listGalleryEntriesForDashboard passes the state filter when provided", async () => {
    const stmt = createStatement({ all: { results: [] } });
    installStatements([stmt]);

    await listGalleryEntriesForDashboard({ state: "listed" });
    expect(stmt.bind).toHaveBeenCalledWith(1, "listed", 500);
  });

  it("listGalleryEntriesForDashboard queries all states when state='all'", async () => {
    const stmt = createStatement({ all: { results: [] } });
    installStatements([stmt]);

    await listGalleryEntriesForDashboard({ state: "all" });
    expect(stmt.bind).toHaveBeenCalledWith(0, "", 500);
  });

  it("creates an unlisted gallery entry via INSERT RETURNING", async () => {
    const insertStmt = createStatement({
      first: {
        id: "new-entry",
        share_token: "new-tok",
        owner_user_id: "owner-3",
        gallery_state: "unlisted",
        gallery_title: "New Entry",
        gallery_description: "Fresh",
        gallery_preview_image: null,
        gallery_published_at: null,
        moderation_hidden_at: null,
        created_at: "2026-06-09T00:00:00.000Z",
        updated_at: "2026-06-09T00:00:00.000Z",
      },
    });
    installStatements([insertStmt]);

    const entry = await createUnlistedGalleryEntry({
      shareToken: "new-tok",
      ownerUserId: "owner-3",
      title: "New Entry",
      description: "Fresh",
    });

    expect(entry).not.toBeNull();
    expect(entry?.galleryState).toBe("unlisted");
    expect(entry?.galleryTitle).toBe("New Entry");
    expect(insertStmt.sql).toContain("insert into gallery_entries");
    expect(insertStmt.sql).toContain("returning");
  });

  it("updateGalleryEntryMetadata runs a SQL UPDATE", async () => {
    const stmt = createStatement({ run: {} });
    installStatements([stmt]);

    await updateGalleryEntryMetadata({
      shareToken: "tok-update",
      title: "Updated Title",
      description: "New desc",
    });

    expect(stmt.run).toHaveBeenCalledOnce();
    expect(stmt.bind).toHaveBeenCalledWith(
      "Updated Title",
      "New desc",
      expect.any(String),
      "tok-update"
    );
  });

  it("setGalleryEntryPreviewImage runs a SQL UPDATE with the given image URL", async () => {
    const stmt = createStatement({ run: {} });
    installStatements([stmt]);

    await setGalleryEntryPreviewImage({
      shareToken: "tok-img",
      previewImage: "/img/preview.jpg",
    });

    expect(stmt.run).toHaveBeenCalledOnce();
    expect(stmt.bind).toHaveBeenCalledWith(
      "/img/preview.jpg",
      expect.any(String),
      "tok-img"
    );
  });

  it("setGalleryEntryPreviewImage accepts null to clear the image", async () => {
    const stmt = createStatement({ run: {} });
    installStatements([stmt]);

    await setGalleryEntryPreviewImage({
      shareToken: "tok-clear",
      previewImage: null,
    });

    expect(stmt.bind).toHaveBeenCalledWith(
      null,
      expect.any(String),
      "tok-clear"
    );
  });

  it("listGalleryEntriesForDashboard handles null field dimensions gracefully", async () => {
    installStatements([
      createStatement({
        all: {
          results: [
            {
              id: "e-null",
              share_token: "t-null",
              owner_user_id: "o-1",
              gallery_state: "listed",
              gallery_title: "",
              gallery_description: "",
              gallery_preview_image: null,
              gallery_published_at: null,
              moderation_hidden_at: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              owner_name: null,
              owner_email: null,
              share_title: null,
              share_expires_at: null,
              share_revoked_at: null,
              field_width: null,
              field_height: null,
              shape_count: 0,
            },
          ],
        },
      }),
    ]);

    const entries = await listGalleryEntriesForDashboard();
    expect(entries[0]).toMatchObject({ fieldWidth: null, fieldHeight: null });
  });
});
