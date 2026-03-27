/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", {
    ifNotExists: true,
  });

  pgm.createTable(
    "shares",
    {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      token: {
        type: "text",
        notNull: true,
        unique: true,
      },
      design_json: {
        type: "jsonb",
        notNull: true,
      },
      title: {
        type: "text",
      },
      description: {
        type: "text",
      },
      field_width: {
        type: "numeric",
      },
      field_height: {
        type: "numeric",
      },
      shape_count: {
        type: "integer",
        notNull: true,
        default: 0,
      },
      created_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
      updated_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
      published_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
      expires_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now() + interval '90 days'"),
      },
      revoked_at: {
        type: "timestamptz",
      },
    },
    {
      ifNotExists: true,
    }
  );

  pgm.createIndex("shares", "token", {
    ifNotExists: true,
    name: "shares_token_idx",
  });

  pgm.createIndex("shares", "revoked_at", {
    ifNotExists: true,
    name: "shares_revoked_at_idx",
  });

  pgm.createIndex("shares", "expires_at", {
    ifNotExists: true,
    name: "shares_expires_at_idx",
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable("shares", {
    ifExists: true,
  });
};
