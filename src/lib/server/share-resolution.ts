import "server-only";

import { decodeDesignWithReason, encodeDesign } from "@/lib/share";
import { resolveStoredShare } from "@/lib/server/shares";
import type { TrackDesign } from "@/lib/types";

export type ResolvedShareView =
  | {
      source: "stored";
      status: "available";
      design: TrackDesign;
      studioSeedToken: string;
      title: string;
      description: string;
    }
  | {
      source: "stored";
      status: "expired" | "revoked";
    }
  | {
      source: "legacy";
      status: "available";
      design: TrackDesign;
      studioSeedToken: string;
    }
  | {
      source: "legacy";
      status: "too-large" | "invalid";
    };

export async function resolveShareView(
  token: string
): Promise<ResolvedShareView> {
  const storedShare = await resolveStoredShare(token);

  if (storedShare.status === "available") {
    return {
      source: "stored",
      status: "available",
      design: storedShare.share.design,
      studioSeedToken: encodeDesign(storedShare.share.design),
      title: storedShare.share.title,
      description: storedShare.share.description,
    };
  }

  if (storedShare.status === "expired" || storedShare.status === "revoked") {
    return {
      source: "stored",
      status: storedShare.status,
    };
  }

  const legacy = decodeDesignWithReason(token);

  if (legacy.ok) {
    return {
      source: "legacy",
      status: "available",
      design: legacy.design,
      studioSeedToken: token,
    };
  }

  return {
    source: "legacy",
    status: legacy.reason,
  };
}
