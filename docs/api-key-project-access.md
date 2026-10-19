# API-key project access

API keys use `tracks:read` for project metadata, track packages, overlay packages and viewer snapshots. Account settings assign this permission automatically and let the owner choose all projects or up to 100 selected active cloud projects. The project selector is searchable. To change an existing key’s selection, create a replacement key and revoke the old key.

All-project keys include current and future owned projects. Selected-project keys include only their saved project IDs; new projects are excluded. An empty selection grants no project access. Project ownership and archive status are always checked, including when a selected project is later removed or belongs to another account. Share tokens never expand project access.

The account key-creation endpoint accepts `projectAccess: { mode: "all" }` or `projectAccess: { mode: "selected", projectIds: [...] }`. The selection is stored atomically with the hashed key in Better Auth metadata. Omitting this field keeps the existing all-project creation behavior. The normalized account key list and creation response include `projectAccess`.

Keys without project-access metadata predate this feature and explicitly resolve to all owned projects. Invalid explicit access metadata fails closed to an empty selection. Existing permissions are retained; new keys default only to `tracks:read`. No database migration is needed. Project list filtering happens in SQL before pagination; every project representation checks the same selection and returns 404 for an inaccessible ID.

Project access is account data covered by the existing privacy and terms provisions for cloud projects and API keys; this change adds no new recipient or data collection category.
