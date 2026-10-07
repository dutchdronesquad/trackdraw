# Obstacle appearances

Compatible MultiGP Standard Gate 5×5 obstacles offer an **Appearance → Artwork** selector in the desktop and mobile inspector. Published artwork is discovered from `https://assets.trackdraw.app/collections.json`; DDS is the first end-to-end pilot. A MultiGP gate directly loads the published MultiGP Standard gate artwork through the same registry pipeline as DDS. Start/finish gates use the MultiGP red variant unless artwork was explicitly selected. The selector lists concrete artwork sets without an extra original/default option. No account is required.

Editable designs store only `appearance: { source, collectionId, textureId, templateId }`. These references travel through autosave, project JSON, undo/redo, shared designs and viewer snapshots. Changing to an incompatible catalog type keeps the requested reference and renders the original geometry; returning to the standard gate makes that selection usable again. Unknown sources and template versions are retained with a fallback.

The public registry supplies artwork only. TrackDraw owns geometry and explicitly advertises template compatibility for the Standard 5 × 5 ft and Championship 7 × 6 ft panel-frame gates. Collections cannot change dimensions or execute rendering code. The `gate-standard-v1` and `gate-championship-v1` mappings prints the front, keeps each panel's top edge at the top and applies an optional solid `backColor`. Editor, read-only/shared rendering, the standalone viewer and flythrough use the same template mapping from `@trackdraw/schema/appearance/registry`.

Metadata and textures are fetched from the asset origin without credentials. Unsupported contracts, unavailable metadata and failed texture loads leave the design editable. Texture error boundaries retain solid geometry; the inspector keeps the saved selection and offers a retry. Discovery and resolution are transient runtime state, not persisted project data.

## Portable snapshots

Online viewer snapshots retain the stable reference. When resolved metadata is available, `design.appearances` contains the validated panel mapping, credits, terms and portable permission, and `assets` contains only the design's actual artwork. Online viewers can resolve references directly when the server generated a snapshot before loading metadata.

Creating `.tdviewer.zip` requires resolving every selected appearance and obtaining the panel bytes. Export refuses unavailable or incompatible appearances and collections whose `usage.portable` is `not-granted`; it never silently writes an incomplete archive. DDS explicitly allows portable/offline track exports. Archives embed the current panels under `/assets/registry/<collection>/<filename>.webp`, their actual sizes/hashes, attribution and usage terms. A cold archive load uses its embedded mapping and object-URL asset resolver without discovery or remote artwork requests.

Existing MultiGP catalog entries, historical URLs and saved designs without an appearance retain their current behavior. Editable JSON stores references rather than embedded images, so opening that JSON offline can use a fallback; the portable viewer archive is the offline artwork format.

## Delivery and verification

The shared appearance contract shipped in `@trackdraw/schema` and `@trackdraw/viewer` 1.0.3. TrackDraw depends on the published schema package, with its registry integrity recorded in the lockfile. No source aliases, private artwork uploads or artwork redistributions are added to the application repository.

Issue #886 remains open until exact-head CI and deployed sharing/flythrough/visual acceptance are verified. Verify panel orientation and the solid back in the editor, shared/read-only viewer and standalone viewer, and export/import plus a cold offline `.tdviewer.zip` load. Package builds and unit tests do not replace those runtime checks.

Championship artwork uses independent left/right panels on the existing 1.5 × 6 ft sides and 10 × 2 ft top. Switching gate types clears incompatible artwork; unavailable artwork keeps the original MultiGP rendering. Race Timing chooses the normal/red MultiGP fallback. Release the companion schema/viewer Championship support before updating the schema dependency and merging this consumer change.
