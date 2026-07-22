-- Account shares used to create an unlisted gallery row automatically.
-- Rows without gallery media or a publication timestamp are ordinary shares,
-- not gallery items, and can be removed without affecting the share itself.
DELETE FROM gallery_entries
WHERE gallery_state = 'unlisted'
  AND gallery_published_at IS NULL
  AND gallery_preview_image IS NULL;
