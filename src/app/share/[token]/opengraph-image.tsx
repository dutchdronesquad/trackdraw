import { ImageResponse } from "next/og";
import { getDesignShapes } from "@/lib/design";
import { decodeDesign, getShareDescription, getShareTitle } from "@/lib/share";
import { resolveShareView } from "@/lib/server/share-resolution";
import { SITE_NAME } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type ShareImageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ShareOpenGraphImage({ params }: ShareImageProps) {
  const { token } = await params;
  const resolvedShare = await resolveShareView(token);
  const design =
    resolvedShare.status === "available"
      ? resolvedShare.design
      : decodeDesign(token);

  const title =
    resolvedShare.status === "available" && resolvedShare.source === "stored"
      ? resolvedShare.title
      : design
        ? getShareTitle(design)
        : "Shared Track";
  const description = design
    ? resolvedShare.status === "available" && resolvedShare.source === "stored"
      ? resolvedShare.description
      : getShareDescription(design)
    : "Open a read-only TrackDraw link to review layout, flow and obstacle placement before race day.";
  const shapeCount = design ? getDesignShapes(design).length : 0;
  const fieldLabel = design
    ? `${design.field.width} x ${design.field.height} m field`
    : "TrackDraw share link";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(145deg, #050816 0%, #0d1535 55%, #131f43 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 36,
          display: "flex",
          borderRadius: 36,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.05)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "56px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "9999px",
              background: "#1E93DB",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 820,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 68,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: "-0.05em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.82)",
              maxWidth: 920,
            }}
          >
            {description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            {[fieldLabel, `${shapeCount} objects`, "Read-only review"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: 9999,
                    fontSize: 22,
                    color: "rgba(255,255,255,0.88)",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            trackdraw.app/share
          </div>
        </div>
      </div>
    </div>,
    size
  );
}
