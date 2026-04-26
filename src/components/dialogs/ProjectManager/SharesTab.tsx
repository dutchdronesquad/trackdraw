"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Check, Copy, ExternalLink, Link2 } from "lucide-react";
import type { AccountShareItem } from "@/components/editor/useAccountProjectSync";
import {
  DesktopActionTooltip,
  EmptyState,
  itemLabel,
  SkeletonCard,
} from "./shared";

function formatExpiresIn(iso: string | null): string {
  if (!iso) return "published";
  const days = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "expired";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

interface ProjectManagerSharesTabProps {
  shares: AccountShareItem[];
  loading: boolean;
  accountProjectTitleById: Record<string, string>;
  onRevoke?: (token: string) => void;
}

export function ProjectManagerSharesTab({
  shares,
  loading,
  accountProjectTitleById,
  onRevoke,
}: ProjectManagerSharesTabProps) {
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<string | null>(
    null
  );
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <EmptyState
        icon={<Link2 className="size-6" />}
        title="No active shares"
        description="Published share links from your account appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {shares.map((share) => {
        const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${encodeURIComponent(share.token)}`;
        const projectTitle = share.projectId
          ? (accountProjectTitleById[share.projectId] ?? null)
          : null;
        const displayTitle = projectTitle ?? share.title;

        return (
          <div
            key={share.token}
            className="group border-border/60 bg-background/70 relative flex items-start gap-3 overflow-hidden rounded-xl border px-3 py-2.5"
          >
            <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Link2 className="text-muted-foreground/60 size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                {displayTitle}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {itemLabel(share.shapeCount)} ·{" "}
                {share.shareType === "published"
                  ? "published until revoked"
                  : formatExpiresIn(share.expiresAt)}
              </p>
            </div>
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <DesktopActionTooltip label="Copy link">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedToken(share.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-colors group-hover:opacity-100"
                >
                  {copiedToken === share.token ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </DesktopActionTooltip>
              <DesktopActionTooltip label="Open in new tab">
                <button
                  type="button"
                  onClick={() =>
                    window.open(shareUrl, "_blank", "noopener,noreferrer")
                  }
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-colors group-hover:opacity-100"
                >
                  <ExternalLink className="size-3.5" />
                </button>
              </DesktopActionTooltip>
              {onRevoke && (
                <DesktopActionTooltip label="Revoke link">
                  <button
                    type="button"
                    onClick={() => setConfirmRevokeToken(share.token)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-colors group-hover:opacity-100"
                  >
                    <Ban className="size-3.5" />
                  </button>
                </DesktopActionTooltip>
              )}
            </div>
            <AnimatePresence>
              {confirmRevokeToken === share.token && (
                <motion.div
                  className="bg-background/97 absolute inset-0 flex items-center justify-between gap-2 rounded-xl px-3 backdrop-blur-sm"
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-foreground truncate text-sm font-medium">
                    Revoke this link?
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        onRevoke!(share.token);
                        setConfirmRevokeToken(null);
                      }}
                      className="bg-destructive/10 hover:bg-destructive/20 text-destructive cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      Revoke
                    </button>
                    <button
                      onClick={() => setConfirmRevokeToken(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
