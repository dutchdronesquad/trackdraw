-- Composite index for the common audit log query pattern:
-- filter by event_type + sort by created_at DESC.
-- The existing single-column indexes make SQLite choose one or the other;
-- this composite index covers both in a single scan.
CREATE INDEX IF NOT EXISTS audit_events_event_type_created_at_idx
  ON audit_events(event_type, created_at DESC);
