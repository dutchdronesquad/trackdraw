ALTER TABLE product_events ADD COLUMN contract_version TEXT;
ALTER TABLE product_events ADD COLUMN expires_at TEXT;
ALTER TABLE users ADD COLUMN product_analytics_enabled INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS product_events_expires_at_idx ON product_events(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS product_events_v1_editor_project_session_dedupe
  ON product_events(contract_version, event_type, session_id, project_id)
  WHERE contract_version = '1.0.0'
    AND event_type IN ('editor.session_started', 'editor.3d_opened');

CREATE UNIQUE INDEX IF NOT EXISTS product_events_v1_share_view_dedupe
  ON product_events(contract_version, event_type, session_id, share_token)
  WHERE contract_version = '1.0.0' AND event_type = 'share.viewed';

CREATE UNIQUE INDEX IF NOT EXISTS product_events_v1_acquisition_dedupe
  ON product_events(contract_version, event_type, session_id)
  WHERE contract_version = '1.0.0' AND event_type = 'acquisition.session_attributed';

CREATE UNIQUE INDEX IF NOT EXISTS product_events_v1_share_action_dedupe
  ON product_events(contract_version, event_type, share_token)
  WHERE contract_version = '1.0.0'
    AND event_type IN ('share.created', 'publication.gallery_published');
