/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    alter table shares
    add column if not exists expires_at timestamptz not null default now() + interval '90 days'
  `);

  pgm.createIndex("shares", "expires_at", {
    ifNotExists: true,
    name: "shares_expires_at_idx",
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropIndex("shares", "expires_at", {
    ifExists: true,
    name: "shares_expires_at_idx",
  });

  pgm.sql(`
    alter table shares
    drop column if exists expires_at
  `);
};
