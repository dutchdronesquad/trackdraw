# 3D beachflags

Studio, shared track views, and flythrough export build the same Three.js flag model. TrackDraw Viewer vendors the model and live clock under its existing rendering-source convention. Catalog identity, nominal height, anchor, heading, and 2D footprint still come from the track. The MultiGP artwork keeps the existing panel aspect and the source UV orientation on each side. Its alpha channel supplies the outline and the visible cloth shadow in shadow-enabled views. Generic flags have a shaped outline and a solid colour.

The mast, ground collar and leading edge stay fixed. Two relative morph targets deform the cloth and its normals along local Z with a repeatable phase from the obstacle ID. Movement from the resting surface is limited to 8% of cloth width or 8 cm, whichever is smaller. The GPU applies the same deformation during the live shadow pass.

- Live Studio and Viewer use elapsed view time. Switching away from 3D, hiding the document, or pausing the in-app flythrough holds the last pose. A resumed view continues from that pose. Reduced motion places the cloth at rest.
- PNG and gallery renders use the resting pose. An interactive screenshot captures the current view. WebM uses the encoded frame timestamp in seconds and reads the reduced-motion preference once when export starts.
- Race replay (#1066) can supply its playback position in seconds to the model and hold that time while paused. This also makes seeks and changes in playback speed reproducible.
- Portable 3D (#1042) can reuse the resting Three.js geometry and standard materials. Use the resting pose as the portable baseline and check two-sided artwork and alpha cutouts in an independent importer. Confirm redistribution permission before embedding artwork. Exporting the geometry does not by itself create an animation clip.

## Validation

Compared the existing and revised generic and MultiGP flags using the same camera, light, artwork and ground for each pair. The browser render fixture covered the front, back and side at rest, deformed frames, 2.4 m and 4.5 m generic heights, a 3.048 m MultiGP flag, rotated headings, and a 96-flag overview. The live shadow followed the cloth and the MultiGP artwork remained legible from both sides. Also encoded and decoded 1280 × 720 WebM at normal and reduced motion.

Frame intervals from 100 sampled frames after 25 warm-up frames in headless Chrome on macOS, with a 2048² directional shadow map and 96 mixed flags:

| Viewport            | Previous p50 / p95 | Animated p50 / p95 |
| ------------------- | ------------------ | ------------------ |
| 1024 × 650 at DPR 1 | 16.7 / 16.8 ms     | 16.7 / 16.7 ms     |
| 390 × 844 at DPR 2  | 16.7 / 16.8 ms     | 16.7 / 16.8 ms     |

Both runs reached the browser's 60 Hz frame cadence. Mobile measurements use device emulation on the Mac. Physical mobile performance and lighting from #1064 remain to be checked.
