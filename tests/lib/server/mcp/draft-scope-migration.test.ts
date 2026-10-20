import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createMigratedDatabase } from "../../../helpers/sqlite-d1";
it("upgrades only existing MCP resource policy, leaving prior grants unchanged", () => {
  const db = createMigratedDatabase("0027_mcp_project_read_scope.sql");
  try {
    db.exec(
      `INSERT INTO oauthResource(id,identifier,name,allowedScopes,policyVersion) VALUES('mcp','https://trackdraw.app/api/mcp','MCP','["mcp:read","offline_access"]',1),('other','https://other.example/api','Other','["mcp:read"]',1); INSERT INTO users(id,email,createdAt,updatedAt) VALUES('user','user@example.invalid','2026-10-20','2026-10-20'); INSERT INTO oauthClient(id,clientId,redirectUris,scopes) VALUES('client','client','[]','["mcp:read"]'); INSERT INTO oauthConsent(id,clientId,userId,scopes,resources,createdAt,updatedAt) VALUES('consent','client','user','["mcp:read"]','["https://trackdraw.app/api/mcp"]','2026-10-20','2026-10-20');`
    );
    const migration = readFileSync(
      new URL(
        "../../../../migrations/0028_mcp_track_drafts.sql",
        import.meta.url
      ),
      "utf8"
    );
    db.exec(migration);
    db.exec(migration.split("-- Receipts")[0]);
    expect(
      db
        .prepare(
          "SELECT allowedScopes,policyVersion FROM oauthResource WHERE id='mcp'"
        )
        .get()
    ).toMatchObject({
      allowedScopes: '["mcp:read","offline_access","projects:create"]',
      policyVersion: 2,
    });
    expect(
      db
        .prepare("SELECT allowedScopes FROM oauthResource WHERE id='other'")
        .get()
    ).toMatchObject({ allowedScopes: '["mcp:read"]' });
    expect(db.prepare("SELECT scopes FROM oauthConsent").get()).toMatchObject({
      scopes: '["mcp:read"]',
    });
    expect(db.prepare("SELECT scopes FROM oauthClient").get()).toMatchObject({
      scopes: '["mcp:read"]',
    });
  } finally {
    db.close();
  }
});
