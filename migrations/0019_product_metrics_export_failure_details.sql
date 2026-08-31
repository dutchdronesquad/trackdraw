UPDATE product_metric_measurement_state
SET contract_version = '1.1.0',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE contract_version = '1.0.0';

DROP INDEX IF EXISTS product_events_v1_editor_project_session_dedupe;
DROP INDEX IF EXISTS product_events_v1_share_view_dedupe;
DROP INDEX IF EXISTS product_events_v1_acquisition_dedupe;
DROP INDEX IF EXISTS product_events_v1_share_action_dedupe;

CREATE UNIQUE INDEX product_events_v1_editor_project_session_dedupe
  ON product_events(contract_version, event_type, session_id, project_id)
  WHERE contract_version IN ('1.0.0', '1.1.0')
    AND event_type IN ('editor.session_started', 'editor.3d_opened');

CREATE UNIQUE INDEX product_events_v1_share_view_dedupe
  ON product_events(contract_version, event_type, session_id, share_token)
  WHERE contract_version IN ('1.0.0', '1.1.0')
    AND event_type = 'share.viewed';

CREATE UNIQUE INDEX product_events_v1_acquisition_dedupe
  ON product_events(contract_version, event_type, session_id)
  WHERE contract_version IN ('1.0.0', '1.1.0')
    AND event_type = 'acquisition.session_attributed';

CREATE UNIQUE INDEX product_events_v1_share_action_dedupe
  ON product_events(contract_version, event_type, share_token)
  WHERE contract_version IN ('1.0.0', '1.1.0')
    AND event_type IN ('share.created', 'publication.gallery_published');
