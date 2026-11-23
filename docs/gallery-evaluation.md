# Gallery discovery and publishing trial

Issue: [#1069](https://github.com/dutchdronesquad/trackdraw/issues/1069).

## Product contract

This trial focuses on helping people showcase a project. The public gallery website keeps its existing design, copy and card destinations. The main Share section in Studio offers “Showcase your track” and opens the publication form directly, without requiring a separately published share link. Signed-out visitors can sign in and return to that section. Anonymous editing, saving, export and temporary sharing remain available.

Publishing is an explicit confirmation: the personal project's current design (or the team's saved server revision) becomes a public snapshot and gallery listing, with the displayed personal or team name. The title defaults to the project name, the description is optional (maximum 500 characters), and personal previews are generated automatically. Team entries retain the standard TrackDraw preview, avoiding uploads from a private team canvas. Existing links are reused and updated only on explicit publication; later internal saves do not update public snapshots. Metadata edits do not republish geometry. Team revision and live permission checks remain authoritative.

If snapshot publication succeeds but listing fails, the share link stays available under Share and the gallery form remains open for retry. Removing a gallery listing preserves its link; revoking the share link removes public access. Previously downloaded copies cannot be recalled.

Missing personal display names block listing and link to Profile. Share-status failures block publication until retry succeeds. Preview capture failures offer retry. Hidden entries retain the moderation lock.

## Trial and decision

Start a **28-day trial on the production deployment date** of this change. Record that date and the evaluation date on #1069 after deployment. The initial decision thresholds are:

- At least 50 gallery track opens and 5 successfully stored editable copies, with copies representing at least 10% of opens: retain the gallery as a discovery surface and review again after a normal release cycle.
- At least 50 opens but fewer than 5 copies or less than 10% conversion: reconsider the gallery's value and choose between further simplification and removal; do not automatically add features.
- Fewer than 50 opens: insufficient exposure. Extend once for 28 days, then explicitly decide whether a maintained collection fits TrackDraw or whether to retire the surface.

These are trial decision rules, not established usage benchmarks. Publication count is supporting evidence, not the success measure. No initial collection is required: whether TrackDraw should add and maintain example tracks remains an open choice. Other creators' tracks require permission.

## Measurement

Use the existing first-party product event endpoint and analytics objection. Existing `share.viewed` events measure views of tracks listed in the gallery. `gallery.track_copied` fires only after Studio has successfully saved both the editable draft and local project. `sourceShare` carries the public share reference through the existing editable-copy link; it contains no track content. The server accepts these events only for active public gallery entries. Views and copies are deduplicated per share and browser session, not per person. A later session can count again. Direct views/copies of a currently listed track contribute to the counts; this measures reuse of showcased tracks, not a precise visitor funnel. Analytics objections can undercount activity.

No names, titles, descriptions, encoded designs or new third-party destinations enter analytics. The existing retention, bot filtering, request bounds and account/browser opt-out apply. Privacy and terms were checked: the existing predefined action categories and project/share references cover these events, so no material legal text change is needed.

Use a read-only query over `product_events` for the recorded deployment/evaluation interval (replace both timestamps):

```sql
SELECT e.event_type, COUNT(*) AS events
FROM product_events e
LEFT JOIN gallery_entries g ON g.share_token = e.share_token
WHERE e.created_at >= 'DEPLOYED_AT_UTC'
  AND e.created_at < 'EVALUATION_AT_UTC'
  AND (
    e.event_type IN ('gallery.track_copied', 'publication.gallery_published')
    OR (e.event_type = 'share.viewed'
      AND json_extract(e.metadata_json, '$.surface') = 'share'
      AND g.gallery_state IN ('listed', 'featured'))
  )
GROUP BY e.event_type;
```

Record counts, trial dates, limitations and the retain/change/remove decision on #1069. Deployment starts the trial; merging does not by itself prove production behavior or trial success.
