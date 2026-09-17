"use client";

import { useMemo, useState } from "react";
import { TrackViewer } from "@trackdraw/viewer";
import { buildMultiOrgDesign, buildSecondDesign } from "./fixtures";

const ASSET_PREFIX_BASE = "/dev/viewer-spike/assets-prefix-demo";

export function ViewerSpikeClient() {
  const [simulateNoWebgl, setSimulateNoWebgl] = useState(false);
  const designA = useMemo(() => buildMultiOrgDesign(), []);
  const designB = useMemo(() => buildSecondDesign(), []);

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">
            Track viewer extraction spike (issue #859)
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            This page renders the standalone <code>@trackdraw/viewer</code>{" "}
            package (packages/viewer/src) with no editor store, next-intl, or
            app chrome involved — only a design object is passed in as a
            prop. To manually compare against the existing editor viewer,
            open the same fixture designs in the editor via the JSON import
            flow (see fixtures.ts for the raw shapes).
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simulateNoWebgl}
              onChange={(event) => setSimulateNoWebgl(event.target.checked)}
            />
            Simulate unsupported WebGL on instance A (should fall back to 2D
            only, 3D toggle hidden)
          </label>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">
              Instance A — multi-org design, light theme, imperial units
            </h2>
            <div className="border-border h-[420px] overflow-hidden rounded-md border">
              <TrackViewer
                design={designA}
                theme="light"
                unitSystem="imperial"
                showObstacleNumbers
                forceWebglUnsupported={simulateNoWebgl}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">
              Instance B — distinct design, dark theme, metric units
              (isolation check: should never show instance A&apos;s shapes)
            </h2>
            <div className="border-border h-[420px] overflow-hidden rounded-md border">
              <TrackViewer design={designB} theme="dark" unitSystem="metric" />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Instance C — same design as A, served under a non-root asset
            prefix ({ASSET_PREFIX_BASE})
          </h2>
          <p className="text-muted-foreground max-w-3xl text-xs">
            Textures for this instance resolve through a rewrite rule in
            next.config.ts that maps {ASSET_PREFIX_BASE}
            /assets/:path* back to /assets/:path* — check the Network tab to
            confirm every texture request for the MultiGP obstacles actually
            goes out under this prefix instead of the root path.
          </p>
          <div className="border-border h-[420px] overflow-hidden rounded-md border">
            <TrackViewer
              design={designA}
              theme="light"
              assetsBaseUrl={ASSET_PREFIX_BASE}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
