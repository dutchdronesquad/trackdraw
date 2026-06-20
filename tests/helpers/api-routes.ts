import { createDefaultDesign } from "@/lib/track/design";
import type { AdminUser } from "@/lib/account/admin-users";
import type { StoredGalleryEntry } from "@/lib/server/gallery";
import type {
  StoredProject,
  StoredProjectSummary,
} from "@/lib/server/projects";
import type { StoredShare } from "@/lib/server/shares";

export const testUser = {
  id: "user-1",
  email: "pilot@trackdraw.local",
  name: "Pilot",
  image: null,
  role: "user" as const,
};

export const adminActor = {
  id: "admin-1",
  email: "admin@trackdraw.local",
  name: "Admin",
  image: null,
  role: "admin" as const,
};

export const moderatorActor = {
  id: "mod-1",
  email: "mod@trackdraw.local",
  name: "Moderator",
  image: null,
  role: "moderator" as const,
};

export function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function routeContext<T extends Record<string, string | string[]>>(
  params: T
) {
  return { params: Promise.resolve(params) };
}

export function createStoredProjectFixture(
  overrides: Partial<StoredProject> = {}
): StoredProject {
  const design = createDefaultDesign();
  return {
    id: "project-1",
    ownerUserId: testUser.id,
    title: "Race layout",
    description: "",
    design,
    designUpdatedAt: design.updatedAt,
    fieldWidth: design.field.width,
    fieldHeight: design.field.height,
    shapeCount: 0,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    archivedAt: null,
    ...overrides,
  };
}

export function createStoredProjectSummaryFixture(
  overrides: Partial<StoredProjectSummary> = {}
): StoredProjectSummary {
  return {
    id: "project-1",
    ownerUserId: testUser.id,
    title: "Race layout",
    fieldWidth: 60,
    fieldHeight: 40,
    shapeCount: 0,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T12:30:00.000Z",
    ...overrides,
  };
}

export function createStoredShareFixture(
  overrides: Partial<StoredShare> = {}
): StoredShare {
  const design = createDefaultDesign();
  return {
    id: "share-id",
    token: "share-token",
    design,
    title: design.title,
    description: "Read-only TrackDraw plan.",
    shapeCount: 0,
    fieldWidth: design.field.width,
    fieldHeight: design.field.height,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    publishedAt: "2026-04-20T10:00:00.000Z",
    expiresAt: "2026-05-20T10:00:00.000Z",
    revokedAt: null,
    ownerUserId: null,
    projectId: null,
    shareType: "temporary",
    ...overrides,
  };
}

export function createAdminUserFixture(
  overrides: Partial<AdminUser> = {}
): AdminUser {
  return {
    id: "user-2",
    name: "Target User",
    email: "target@trackdraw.local",
    image: null,
    role: "user",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastLoginAt: null,
    projectCount: 0,
    ...overrides,
  };
}

export function createGalleryEntryFixture(
  overrides: Partial<StoredGalleryEntry> = {}
): StoredGalleryEntry {
  return {
    id: "entry-1",
    shareToken: "share-token",
    ownerUserId: "owner-1",
    galleryState: "listed",
    galleryTitle: "Track",
    galleryDescription: "Public description",
    galleryPreviewImage: "gallery/previews/entry-1.webp",
    galleryPublishedAt: "2026-04-20T10:00:00.000Z",
    moderationHiddenAt: null,
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    ...overrides,
  };
}
