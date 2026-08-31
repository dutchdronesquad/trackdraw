export const auditActorKinds = ["user", "api_key", "system"] as const;

export type AuditActorKind = (typeof auditActorKinds)[number];

export const auditEventCategories = [
  "Account",
  "Credentials",
  "Projects",
  "Gallery",
  "Share",
  "Privacy",
  "System",
] as const;

export type AuditEventCategory = (typeof auditEventCategories)[number];

export const auditEventTypes = {
  accountBanned: "account.banned",
  accountDeleted: "account.deleted",
  accountEmailChanged: "account.email.changed",
  accountRoleChanged: "account.role.changed",
  accountUnbanned: "account.unbanned",
  apiKeyCreated: "api_key.created",
  apiKeyRevoked: "api_key.revoked",
  galleryEntryDeleted: "gallery.entry.deleted",
  galleryEntryFeatured: "gallery.entry.featured",
  galleryEntryHidden: "gallery.entry.hidden",
  galleryEntryListed: "gallery.entry.listed",
  galleryEntryMetadataUpdated: "gallery.entry.metadata_updated",
  galleryEntryRestored: "gallery.entry.restored",
  galleryEntryUnfeatured: "gallery.entry.unfeatured",
  galleryEntryUnlisted: "gallery.entry.unlisted",
  passkeyAdded: "credential.passkey.added",
  passkeyRemoved: "credential.passkey.removed",
  passkeyRenamed: "credential.passkey.renamed",
  privacyAnalyticsChanged: "privacy.analytics.changed",
  projectArchived: "project.archived",
  projectCreated: "project.created",
  projectForceOverwritten: "project.force_overwritten",
  sharePublished: "share.published",
  sharePurged: "share.purged",
  shareRevoked: "share.revoked",
  systemMetricsMaintenanceCompleted: "system.metrics.maintenance.completed",
} as const;

export type AuditEventType =
  (typeof auditEventTypes)[keyof typeof auditEventTypes];

export const auditEventTitleKeys: Record<string, string> = {
  [auditEventTypes.accountRoleChanged]: "accountRoleChanged",
  [auditEventTypes.accountBanned]: "accountBanned",
  [auditEventTypes.accountUnbanned]: "accountUnbanned",
  [auditEventTypes.accountDeleted]: "accountDeleted",
  [auditEventTypes.accountEmailChanged]: "accountEmailChanged",
  [auditEventTypes.apiKeyCreated]: "apiKeyCreated",
  [auditEventTypes.apiKeyRevoked]: "apiKeyRevoked",
  [auditEventTypes.passkeyAdded]: "passkeyAdded",
  [auditEventTypes.passkeyRenamed]: "passkeyRenamed",
  [auditEventTypes.passkeyRemoved]: "passkeyRemoved",
  [auditEventTypes.galleryEntryFeatured]: "galleryEntryFeatured",
  [auditEventTypes.galleryEntryUnfeatured]: "galleryEntryUnfeatured",
  [auditEventTypes.galleryEntryHidden]: "galleryEntryHidden",
  [auditEventTypes.galleryEntryRestored]: "galleryEntryRestored",
  [auditEventTypes.galleryEntryDeleted]: "galleryEntryDeleted",
  [auditEventTypes.galleryEntryListed]: "galleryEntryListed",
  [auditEventTypes.galleryEntryUnlisted]: "galleryEntryUnlisted",
  [auditEventTypes.galleryEntryMetadataUpdated]: "galleryEntryMetadataUpdated",
  [auditEventTypes.privacyAnalyticsChanged]: "privacyAnalyticsChanged",
  [auditEventTypes.projectCreated]: "projectCreated",
  [auditEventTypes.projectArchived]: "projectArchived",
  [auditEventTypes.projectForceOverwritten]: "projectForceOverwritten",
  [auditEventTypes.sharePublished]: "sharePublished",
  [auditEventTypes.shareRevoked]: "shareRevoked",
  [auditEventTypes.sharePurged]: "sharePurged",
  [auditEventTypes.systemMetricsMaintenanceCompleted]:
    "metricsMaintenanceCompleted",
};

export function getAuditEventCategory(eventType: string): AuditEventCategory {
  if (eventType.startsWith("account.")) return "Account";
  if (eventType.startsWith("api_key.") || eventType.startsWith("credential.")) {
    return "Credentials";
  }
  if (eventType.startsWith("project.")) return "Projects";
  if (eventType.startsWith("gallery.")) return "Gallery";
  if (eventType.startsWith("share.")) return "Share";
  if (eventType.startsWith("privacy.")) return "Privacy";
  return "System";
}
