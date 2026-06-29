"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Check, Copy, ExternalLink, Link2 } from "lucide-react";
import type { AccountShareItem } from "@/components/editor/useAccountProjectSync";
import { useTranslations } from "next-intl";
import {
  DesktopActionTooltip,
  EmptyState,
  itemLabel,
  SkeletonCard,
} from "./shared";

function formatExpiresIn(
  iso: string | null,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): string {
  if (!iso) return t("projectManager.shares.status.published");
  const days = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return t("projectManager.shares.status.expired");
  return t("projectManager.shares.status.expiresInDays", { days });
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
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<string | null>(
    null
  );
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <p className="text-muted-foreground px-1 pb-1 text-[11px]">
          {t("projectManager.shares.status.loadingPublishedShares")}
        </p>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <EmptyState
        icon={<Link2 className="size-6" />}
        title={t("projectManager.shares.empty.noShares")}
        description={t("projectManager.shares.empty.description")}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground px-1 pb-1 text-[11px] leading-relaxed">
        {t("projectManager.shares.messages.readOnlyReviewLinks")}
      </p>
      {shares.map((share) => {
        const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${encodeURIComponent(share.token)}`;
        const projectTitle = share.projectId
          ? (accountProjectTitleById[share.projectId] ?? null)
          : null;
        const displayTitle = projectTitle ?? share.title;
        const lifetimeLabel =
          share.shareType === "published"
            ? t("projectManager.shares.lifetime.published")
            : t("projectManager.shares.lifetime.temporary", {
                expiresIn: formatExpiresIn(share.expiresAt, t),
              });

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
                {itemLabel(share.shapeCount)} · {lifetimeLabel}
              </p>
            </div>
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <DesktopActionTooltip
                label={t("projectManager.shares.actions.copyLink")}
              >
                <button
                  type="button"
                  aria-label={t("projectManager.shares.aria.copyLink")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedToken(share.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  {copiedToken === share.token ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </DesktopActionTooltip>
              <DesktopActionTooltip
                label={t("projectManager.shares.actions.openTab")}
              >
                <button
                  type="button"
                  aria-label={t("projectManager.shares.aria.openTab")}
                  onClick={() =>
                    window.open(shareUrl, "_blank", "noopener,noreferrer")
                  }
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  <ExternalLink className="size-3.5" />
                </button>
              </DesktopActionTooltip>
              {onRevoke && (
                <DesktopActionTooltip
                  label={t("projectManager.shares.actions.revokeLink")}
                >
                  <button
                    type="button"
                    aria-label={t("projectManager.shares.aria.revokeLink")}
                    onClick={() => setConfirmRevokeToken(share.token)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
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
                    {t("projectManager.shares.confirm.revokeLink")}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        onRevoke!(share.token);
                        setConfirmRevokeToken(null);
                      }}
                      className="bg-destructive/10 hover:bg-destructive/20 text-destructive cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {t("projectManager.shares.actions.revokeLink")}
                    </button>
                    <button
                      onClick={() => setConfirmRevokeToken(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors"
                    >
                      {tCommon("actions.cancel")}
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
