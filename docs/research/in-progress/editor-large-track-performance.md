# Large-track editor performance

Investigation date: November 5, 2026. Scope: shared Studio rendering in the browser and Tauri, with no reduction in track detail or change to editing semantics.

These shared editor optimizations can ship to the browser independently of desktop development. Tauri measurements below are evaluation results from the experimental desktop branch, not a dependency or a desktop release announcement.

## Workload and measurement boundary

The stress fixture contains 250 obstacles and one route with 200 points on a 180 × 110 m field: 80 gates, 50 flags, 50 cones, 30 net barriers, 15 ladders, 10 towers, 10 dive gates and 5 start/finish markers. Each net is 9.25 × 3.5 m. This deliberately emphasizes dense nets; it is not representative of every large track.

Each active phase warms up for 3 seconds and samples for 8 seconds. Camera orbit uses a fixed radius and height; the editing phase selects twenty gates and repeatedly applies reversible position updates. History is paused during the interaction and positions are restored afterward. Count unique browser animation-frame timestamps with actual Three.js render submissions or Konva content-layer draws, rather than counting idle animation callbacks. Also collect frame intervals, render CPU time, draw calls, triangle counts, viewport size and visibility. This measures renderer cadence, not compositor presentation or physical pointer-to-screen latency.

The native probe uses the packaged Tauri release on macOS, a 1440 × 928 viewport and device pixel ratio 2. Temporary instrumentation and synthetic projects are isolated from normal user profiles. The web probe uses the production Next.js editor bundle with its browser store, hosted in Chromium; it does not substitute the desktop editor adapters for browser persistence. Measurements from that host are not a Safari or Firefox compatibility claim.

## Confirmed 3D bottleneck and first change

`src/components/canvas/preview3d/items/Barrier3D.tsx` rendered every wire of every net as an individual mesh. A 9.25 × 3.5 m net contains 95 wires and three posts. Thirty nets therefore contributed 2,850 individual wire submissions. The whole scene submitted 5,670 draw calls when orbiting, including shadow passes.

`net-barrier-wires.tsx` now renders one instanced wire mesh per net. Each instance uses the original five-sided cylinder, radius, orientation and length. Posts and selected/unselected materials stay the same. Dimension changes update instance matrices and culling bounds. The renderer is shared by Studio's browser and desktop builds.

| Native diagnostic probe        |  Before | Instanced nets |
| ------------------------------ | ------: | -------------: |
| Orbit FPS                      |   34.75 |         59.875 |
| Orbit render CPU p95           |   25 ms |          12 ms |
| Orbit draw calls               |   5,670 |          2,850 |
| Orbit triangles                | 365,070 |        365,070 |
| Move twenty objects draw calls |   5,850 |          3,030 |
| Move twenty objects triangles  | 387,350 |        387,350 |

These are individual diagnostic runs with material-submission profiling enabled, not repeated release-wide averages. The candidate reached 38.125 FPS while moving twenty objects; the earlier three-run baseline median was 26.125 FPS, measured without material classification. That comparison is indicative rather than a matched before/after claim.

The original component regression failed with 98 meshes where four were expected. It passes with the instanced renderer. Tests compare every wire vertex and normal against the original cylinders at multiple dimensions, verify updated bounds after resizing without changing instance count, and exercise actual Three.js raycasts on a translated and rotated net. Selected material properties are checked at the real `Barrier3D` call site.

## Production web verification

Three runs per version, alternating before/after/after/before/before/after, used the actual production web editor in a dedicated Chromium host. The viewport was 1440 × 928 at DPR 2; the WebGL drawing buffer was 1800 × 1702 in every phase. Every run remained visible and restored the moved shapes to within 1e-6 m of their starting positions.

| Web editor, three-run median |        Before | Instanced nets |
| ---------------------------- | ------------: | -------------: |
| Orbit FPS                    |          28.5 |         47.875 |
| Orbit FPS range              | 27.375–28.875 |      44–53.125 |
| Move twenty objects FPS      |        14.875 |         19.875 |
| Move FPS range               |   14.375–15.5 |     19.25–20.5 |

Draw calls and triangle counts matched the native diagnostic table in all web runs. The median gains are approximately 68% for orbit and 34% for the synthetic edit loop. Do not compare these absolute web FPS values directly with the native diagnostic: the host, drawing-buffer dimensions and instrumentation differ. Background work on the development machine was not fully controlled, so these are local engineering measurements rather than release performance guarantees.

Before/after screenshots at the same initial camera pose were visually checked. Across the 2880 × 1856 RGB capture, the mean absolute channel difference was approximately 0.00082 on a 0–255 scale. Geometry tests provide the detailed wire-level equivalence check; the screenshot alone is not a close-up interaction acceptance test.

## Other findings and next steps

1. **2D update scheduling:** the synthetic twenty-object store-update loop rendered about 27 FPS while model mutation p95 was about 1 ms and drawing p95 about 6 ms. Forcing synchronous React commits raised it to about 43 FPS but moved more work into each update. Do not add global `flushSync`: this probe drives the store from animation callbacks, whereas real pointer dragging uses its own event batching and preview/commit path. The pointer-drag follow-up below tests the actual single and group drag handlers separately from this synthetic store loop.
2. **Shadow passes:** disabling shadows reduced draw calls from 5,670 to 4,907, but orbit still reached only about 41 FPS. Freezing the shadow map did not produce a reliable improvement and can leave stale interactive shadows. Neither change is included.
3. **Remaining 3D work:** instancing other repeated opaque geometry is a follow-up candidate. Measure the composition of real user tracks first; do not assume nets dominate all scenes. Avoid grouping meshes with different materials, selection state, transparency or interaction ownership merely to reduce a counter.

No quality setting, track schema, autosave behavior, toolbar layout, workflow or CI job is changed by this slice. Further optimization of the synthetic editing loop and actual pointer latency remains open.

## 3D validation

The focused renderer suite passes all eight tests. Lint, TypeScript, the production Next.js build and the Tauri frontend production build pass. The first full suite completed with 1,902 passing tests and two dashboard failures under load: a debounce assertion and a five-second timeout. Isolated reruns passed both tests with their original settings once the concurrent build/benchmark workload ended. The metrics test also passed on the unmodified baseline. These reruns do not make the initial full-suite result green. No dashboard code or timeout setting is changed here.

## 2D pointer-drag follow-up

The same 250-obstacle/200-point-route fixture was tested at 65% zoom in a 1440 × 928 viewport at DPR 2, dragging one gate and a selection of twenty gates. Chromium receives native browser input events; the packaged Tauri release receives macOS mouse events. Event trust, actual moved shape count and one undo step per drag are checked. The candidate also verifies that undo restores all shapes and redo restores the complete dragged shape record. Coordinate calibration and all profiling instrumentation stay in temporary test applications and isolated profiles.

### Confirmed unnecessary work

- Single-object drag events bubble to two separate Stage consumers: the viewport listener and the Stage drag callbacks. Both must filter on `event.target`. Otherwise an object drag is treated as viewport panning, marks the view as manual and schedules transform checks even though pan/zoom do not change. Guarding only the viewport listener did not fix the real reproduction; the Stage callbacks required their own regression test.
- The group drag handler supplies fresh preview objects, including unchanged positions. `setGroupDragPreview` now preserves the current state when offsets, origin and ordered members are equal. Changed positions, origins, selection members and clearing remain reactive. It does not round movement values or alter the design/history.

| Tauri slow-drag diagnostic, approximately eight sampled seconds | Before | After |
| --------------------------------------------------------------- | -----: | ----: |
| Single-drag pointer events                                      |    415 |   413 |
| Canvas component function executions                            |    831 |   415 |
| Unchanged viewport transform checks                             |    414 |     0 |
| Group-drag pointer events                                       |    412 |   415 |
| Group-preview UI updates                                        |    413 |   275 |
| Repeated identical group previews                               |    140 |     0 |
| Design commits / undo entries per drag                          |  1 / 1 | 1 / 1 |

Component counts record function execution, including React bailout work, not committed renders. The Chromium desktop host showed the same reduction from about two canvas executions per single-drag event to one. A separate candidate run used the actual production Next.js web editor with browser persistence and the same native browser input; its drag, undo and redo checks also pass. This anonymous editing check does not exercise Cloudflare-backed account or cloud-save flows. Stationary unselected shapes already remained outside React updates in both versions; do not attribute that existing behavior to this change.

### FPS interpretation

The original slow trajectory rounded many successive input events to the same pixel. In that run, 413 group-preview updates contained 140 identical positions, and the scene submitted 273 draws. Approximately 33–35 FPS therefore did not establish a 30 FPS renderer limit. An independent animation-frame observer confirmed the draw counts; the missing distinction was input demand, not idle animation callbacks. CPU sampling of that trajectory spent about three quarters of its time idle.

A faster continuous trajectory counts distinct pointer coordinates alongside scene draws. In the candidate's individual validation runs:

| Runtime                                   | Single drag FPS | Twenty-object drag FPS |
| ----------------------------------------- | --------------: | ---------------------: |
| Chromium desktop host                     |            56.3 |                   59.5 |
| Production Next.js web editor in Chromium |            59.5 |                   58.0 |
| Packaged Tauri                            |            59.3 |                   59.5 |

Tauri drew 486 frames for 486 distinct single-drag positions and 487 for 487 group-drag positions. Chromium similarly submitted one draw per distinct position, plus a final redraw. These are renderer-cadence observations on the development machine, not compositor or physical input-latency measurements. The faster trajectory also uses a steadier input cadence, so it must not be presented as a before/after FPS improvement over the slow trajectory. The confirmed benefit of this slice is less redundant work with preserved interaction behavior.

### Follow-up validation

Regressions fail against the original Stage callbacks, viewport listener and group-preview setter. All 73 focused interaction/store tests pass after the fixes. On the desktop evaluation branch, the complete suite passes 1,909 tests across 281 files; lint, TypeScript and the production web build pass. The Tauri frontend build and isolated native release build pass. No workflow, quality setting, layout, schema or persistence format is changed.

If another user track remains slow, capture its actual input demand and CPU/GPU profile before changing rendering architecture. This fixture does not justify global synchronous flushing, reduced detail or imperative reparenting of React-owned shapes. More complex tracks, sustained high-rate input, touch interaction latency and physical display presentation remain separate profiling targets.

## Independent browser delivery

The 2D and 3D changes are also validated directly on the `main` codebase, without the desktop store factory, native runtime, desktop dependencies or desktop CI changes. That independent browser branch passes all 1,901 tests across 277 files, lint, formatting, TypeScript and the production Next.js build. Its lower test count reflects the absence of the experimental desktop tests. The performance work does not require a desktop release; desktop integration can consume the shared changes from `main` later.
