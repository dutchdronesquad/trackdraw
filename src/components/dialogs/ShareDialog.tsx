"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/store/editor";
import { selectDesignShapeCount } from "@/store/selectors";
import { encodeDesign } from "@/lib/share";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseEditorView } from "@/lib/view";
import { authClient } from "@/lib/auth-client";
import {
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Share2,
  Link2,
  Boxes,
  X,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LAST_SHARE_TOKEN_KEY = "trackdraw-last-share-token";
const LAST_SHARE_STATE_KEY = "trackdraw-last-share-state";
const SHARE_EXPIRY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

interface StoredShareState {
  sourceToken: string;
  expiresInDays: 7 | 30 | 90;
  url: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPath?: boolean;
  projectId?: string | null;
  onExportJson?: () => void;
  onSharePublished?: () => void;
}

function getShareTokenFromUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] !== "share" || !segments[1]) {
      return null;
    }

    return decodeURIComponent(segments[1]);
  } catch {
    return null;
  }
}

function ShareContent({
  onClose,
  hasPath = false,
  projectId = null,
  onExportJson,
  onSharePublished,
  mobile = false,
}: {
  onClose: () => void;
  hasPath?: boolean;
  projectId?: string | null;
  onExportJson?: () => void;
  onSharePublished?: () => void;
  mobile?: boolean;
}) {
  const design = useEditor((s) => s.track.design);
  const shapeCount = useEditor(selectDesignShapeCount);
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [publishedShareUrl, setPublishedShareUrl] = useState<string | null>(
    null
  );
  const [expiresInDays, setExpiresInDays] = useState<7 | 30 | 90>(90);
  const [publishedExpiresInDays, setPublishedExpiresInDays] = useState<
    7 | 30 | 90 | null
  >(null);
  const [publishedSourceToken, setPublishedSourceToken] = useState<
    string | null
  >(null);
  const currentView = parseEditorView(searchParams.get("view")) ?? "2d";

  const currentToken = encodeDesign(design);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const shareTitle = design.title.trim() || "Untitled track";
  const hostname =
    typeof window !== "undefined" ? window.location.host : "trackdraw.app";

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const storedToken = (() => {
    try {
      return typeof window !== "undefined"
        ? localStorage.getItem(LAST_SHARE_TOKEN_KEY)
        : null;
    } catch {
      return null;
    }
  })();
  const storedShareState = (() => {
    try {
      if (typeof window === "undefined") {
        return null;
      }

      const raw = localStorage.getItem(LAST_SHARE_STATE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredShareState>;

      if (
        typeof parsed.url !== "string" ||
        typeof parsed.sourceToken !== "string" ||
        (parsed.expiresInDays !== 7 &&
          parsed.expiresInDays !== 30 &&
          parsed.expiresInDays !== 90)
      ) {
        return null;
      }

      return parsed as StoredShareState;
    } catch {
      return null;
    }
  })();
  const lastShareToken = sessionToken ?? storedToken;
  const hasChangedSinceShare =
    lastShareToken !== null && lastShareToken !== currentToken;
  const shareNeedsRefresh =
    (!!publishedShareUrl && publishedSourceToken !== currentToken) ||
    (!!publishedShareUrl &&
      publishedExpiresInDays !== null &&
      publishedExpiresInDays !== expiresInDays);
  const canUseShareActions = !!publishedShareUrl;
  const showOutdatedNotice = publishedShareUrl && hasChangedSinceShare;
  const showRefreshNotice = publishedShareUrl && shareNeedsRefresh;
  const activeShareToken = getShareTokenFromUrl(publishedShareUrl);

  const writeLastShareToken = () => {
    try {
      localStorage.setItem(LAST_SHARE_TOKEN_KEY, currentToken);
      setSessionToken(currentToken);
    } catch {
      /* ignore quota errors */
    }
  };

  const persistPublishedShare = (nextState: StoredShareState) => {
    try {
      localStorage.setItem(LAST_SHARE_STATE_KEY, JSON.stringify(nextState));
    } catch {
      /* ignore quota errors */
    }
  };

  const clearPublishedShare = () => {
    setPublishedShareUrl(null);
    setPublishedSourceToken(null);
    setPublishedExpiresInDays(null);

    try {
      localStorage.removeItem(LAST_SHARE_STATE_KEY);
    } catch {
      /* ignore quota errors */
    }
  };

  useEffect(() => {
    if (
      !storedShareState ||
      storedShareState.sourceToken !== currentToken ||
      storedShareState.expiresInDays !== expiresInDays
    ) {
      return;
    }

    setPublishedShareUrl((current) => current ?? storedShareState.url);
    setPublishedSourceToken(
      (current) => current ?? storedShareState.sourceToken
    );
    setPublishedExpiresInDays(
      (current) => current ?? storedShareState.expiresInDays
    );
  }, [currentToken, expiresInDays, storedShareState]);

  const publishShareUrl = async (force = false) => {
    if (publishedShareUrl && !force && !shareNeedsRefresh) {
      return publishedShareUrl;
    }

    const previousToken = activeShareToken;
    setPublishing(true);

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design,
          view: currentView,
          expiresInDays,
          ...(projectId ? { projectId } : {}),
        }),
      });

      const data = (await response.json()) as
        | { ok: true; share: { path: string } }
        | { ok: false; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.ok
            ? "Failed to create share link"
            : (data.error ?? "Failed to create share link")
        );
      }

      const url = new URL(data.share.path, window.location.origin).toString();
      setPublishedShareUrl(url);
      setPublishedSourceToken(currentToken);
      setPublishedExpiresInDays(expiresInDays);
      persistPublishedShare({
        url,
        sourceToken: currentToken,
        expiresInDays,
      });

      // Silently revoke the previous share when replacing — only possible for
      // authenticated owners. Failure is non-blocking; the new link is already live.
      if (force && previousToken && isAuthenticated) {
        fetch(`/api/shares/${encodeURIComponent(previousToken)}`, {
          method: "DELETE",
        }).catch(() => {
          /* ignore */
        });
      }

      onSharePublished?.();
      return url;
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (force = false) => {
    try {
      await publishShareUrl(force);
      writeLastShareToken();
      toast.success(force ? "Link updated" : "Link created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create share link"
      );
    }
  };

  const handleCopy = async () => {
    try {
      const url = await publishShareUrl(shareNeedsRefresh);
      await navigator.clipboard.writeText(url);
      writeLastShareToken();
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create share link"
      );
      const input =
        document.querySelector<HTMLInputElement>("#share-url-input");
      input?.select();
    }
  };

  const handleNativeShare = async () => {
    try {
      const url = await publishShareUrl(shareNeedsRefresh);
      await navigator.share({
        title: design.title || "TrackDraw",
        text: `Check out this FPV track: ${design.title || "Untitled"}`,
        url,
      });
      writeLastShareToken();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      /* user cancelled */
    }
  };

  const revokePublishedShare = async () => {
    if (!activeShareToken) {
      throw new Error("Missing published share token");
    }

    setRevoking(true);

    try {
      const response = await fetch(
        `/api/shares/${encodeURIComponent(activeShareToken)}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.ok
            ? "Failed to revoke share link"
            : (data.error ?? "Failed to revoke share link")
        );
      }

      clearPublishedShare();
    } finally {
      setRevoking(false);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokePublishedShare();
      toast.success("Link revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke share link"
      );
    }
  };

  const publishedLifetimeLabel =
    publishedExpiresInDays === null ? null : `${publishedExpiresInDays} days`;
  const primaryActionLabel = publishedShareUrl
    ? shareNeedsRefresh
      ? "Update link"
      : "Copy link"
    : "Create link";
  const primaryAction = publishedShareUrl
    ? shareNeedsRefresh
      ? () => handlePublish(true)
      : handleCopy
    : () => handlePublish();
  const primaryActionIcon = publishedShareUrl
    ? shareNeedsRefresh
      ? Link2
      : copied
        ? Check
        : Copy
    : Link2;
  const PrimaryActionIcon = primaryActionIcon;

  if (mobile) {
    return (
      <div className="space-y-4 px-4 pt-3 pb-4">
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Current track
          </p>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {shareTitle}
            </p>
            <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
              Create a read-only snapshot link for this track and choose how
              long it stays active.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="border-border/40 bg-background/65 text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Field</span>
              <span className="font-medium">
                {design.field.width}×{design.field.height}m
              </span>
            </div>
            <div className="border-border/40 bg-background/65 text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Objects</span>
              <span className="font-medium">{shapeCount}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground/70 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Link lifetime
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SHARE_EXPIRY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setExpiresInDays(option.value)}
                className={cn(
                  "border-border/60 bg-background/65 text-foreground hover:bg-muted/40 cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors",
                  expiresInDays === option.value &&
                    "border-primary bg-primary/10 text-primary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
              <Link2 className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                {publishedShareUrl ? "Published link" : "No published link yet"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {publishedShareUrl
                  ? `Read-only snapshot on ${hostname}, expires in ${publishedLifetimeLabel}`
                  : `Create a read-only snapshot in ${currentView.toUpperCase()} review.`}
              </p>
            </div>
          </div>
          {publishedShareUrl ? (
            <input
              id="share-url-input"
              readOnly
              value={publishedShareUrl}
              onFocus={(e) => e.target.select()}
              className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
            />
          ) : null}
          {showRefreshNotice ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
              <Share2 className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-relaxed">
                This link no longer reflects the latest design or expiry
                selection.
              </span>
            </div>
          ) : showOutdatedNotice ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
              <Share2 className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-relaxed">
                This track changed after the current link was created.
              </span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={primaryAction}
              disabled={publishing || revoking}
              className="w-full"
            >
              <PrimaryActionIcon className="size-4" />
              {primaryActionLabel}
            </Button>
            {publishedShareUrl && isAuthenticated ? (
              <div className="grid grid-cols-1 gap-2">
                {!shareNeedsRefresh ? (
                  <Button
                    variant="outline"
                    onClick={() => handlePublish(true)}
                    disabled={publishing || revoking}
                    className="w-full"
                  >
                    <RefreshCw className="size-4" />
                    Regenerate link
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={publishing || revoking}
                  className="w-full"
                >
                  <Ban className="size-4" />
                  Revoke
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Read-only notice */}
        <div className="border-border/50 bg-muted/12 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px]">
          <Share2 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            Shared links open as read-only review pages.{" "}
            {hasPath
              ? `This link opens straight into ${currentView.toUpperCase()} review, and the route is ready for fly-through.`
              : "Add a path first if you want reviewers to use fly-through and elevation review."}
          </p>
        </div>

        {/* Action list */}
        <div className="border-border/50 overflow-hidden rounded-xl border">
          {canNativeShare && canUseShareActions && (
            <button
              onClick={handleNativeShare}
              className="border-border/40 hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors"
            >
              <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Share2 className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">
                  Share via…
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Send to apps or contacts
                </p>
              </div>
            </button>
          )}
          {canUseShareActions ? (
            <button
              onClick={async () => {
                try {
                  const url = await publishShareUrl(shareNeedsRefresh);
                  window.open(url, "_blank", "noopener,noreferrer");
                  writeLastShareToken();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to create share link"
                  );
                }
              }}
              className={cn(
                "hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
                onExportJson ? "border-border/40 border-b" : ""
              )}
            >
              <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                <ExternalLink className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">
                  Open in tab
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Preview the share link in a new window
                </p>
              </div>
            </button>
          ) : null}
          {onExportJson && (
            <button
              onClick={onExportJson}
              className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
            >
              <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Boxes className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">
                  Export JSON instead
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Reliable long-term backup, not URL-dependent
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop: 2-column layout
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Studio
          </p>
          <p className="text-foreground mt-2 text-[1.1rem] font-semibold tracking-[-0.02em]">
            Publish Share
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Create a read-only snapshot link you can send to others.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground/75 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Full-width warnings */}
      {(showRefreshNotice || showOutdatedNotice) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
          <Share2 className="mt-0.5 size-3.5 shrink-0" />
          <span className="leading-relaxed">
            {showRefreshNotice
              ? "This link no longer reflects the latest design or expiry selection."
              : "This track changed after the current link was created."}
          </span>
        </div>
      )}
      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: design card + link */}
        <div className="space-y-3">
          {/* Design card */}
          <div className="border-border/60 bg-muted/18 overflow-hidden rounded-xl border">
            <div className="border-border/50 bg-card/70 flex items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">
                  {shareTitle}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {currentView.toUpperCase()} view
                </p>
              </div>
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Share2 className="size-4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/5">
              <div className="px-4 py-3">
                <p className="text-muted-foreground/70 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Field
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {design.field.width}×{design.field.height}m
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-muted-foreground/70 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Objects
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {shapeCount}
                </p>
              </div>
            </div>
          </div>

          <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
            <div>
              <p className="text-foreground text-sm font-medium">
                Link expires after
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Published snapshots stay available until they expire.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SHARE_EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExpiresInDays(option.value)}
                  className={cn(
                    "border-border/60 bg-background/65 text-foreground hover:bg-muted/40 cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors",
                    expiresInDays === option.value &&
                      "border-primary bg-primary/10 text-primary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
                <Link2 className="text-muted-foreground size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {publishedShareUrl
                    ? "Published link"
                    : "No published link yet"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {publishedShareUrl
                    ? `Read-only snapshot on ${hostname}, expires in ${publishedLifetimeLabel}`
                    : "Choose a lifetime and create a read-only snapshot."}
                </p>
              </div>
            </div>
            {publishedShareUrl ? (
              <input
                id="share-url-input"
                readOnly
                value={publishedShareUrl}
                onFocus={(e) => e.target.select()}
                className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
              />
            ) : null}
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={primaryAction}
                disabled={publishing || revoking}
                className="w-full"
              >
                <PrimaryActionIcon className="size-4" />
                {primaryActionLabel}
              </Button>
              {publishedShareUrl ? (
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRevoke}
                    disabled={publishing || revoking}
                    className="w-full"
                  >
                    <Ban className="size-4" />
                    Revoke
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: notices + actions */}
        <div className="space-y-3">
          {/* Read-only notice */}
          <div className="border-border/50 bg-muted/12 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px]">
            <Share2 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Shared links open as read-only review pages.{" "}
              {hasPath
                ? `This link opens straight into ${currentView.toUpperCase()} review, and the route is ready for fly-through.`
                : "Add a path first if you want reviewers to use fly-through and elevation review."}
            </p>
          </div>

          {/* Action list */}
          <div className="border-border/50 overflow-hidden rounded-xl border">
            {canNativeShare && canUseShareActions && (
              <button
                onClick={handleNativeShare}
                className="border-border/40 hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors"
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Share2 className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    Share via…
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Send to apps or contacts
                  </p>
                </div>
              </button>
            )}
            {canUseShareActions ? (
              <button
                onClick={async () => {
                  try {
                    const url = await publishShareUrl(shareNeedsRefresh);
                    window.open(url, "_blank", "noopener,noreferrer");
                    writeLastShareToken();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to create share link"
                    );
                  }
                }}
                className={cn(
                  "hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
                  onExportJson ? "border-border/40 border-b" : ""
                )}
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <ExternalLink className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    Open in tab
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Preview the share link in a new window
                  </p>
                </div>
              </button>
            ) : null}
            {onExportJson && (
              <button
                onClick={onExportJson}
                className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Boxes className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    Export JSON instead
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Reliable long-term backup, not URL-dependent
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShareDialog({
  open,
  onOpenChange,
  hasPath = false,
  projectId = null,
  onExportJson,
  onSharePublished,
}: ShareDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Share"
        subtitle="Share a read-only review link for this track"
        contentClassName="border-border/60 bg-background shadow-[0_-18px_40px_rgba(0,0,0,0.18)] data-[vaul-drawer-direction=bottom]:mt-12 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
        bodyClassName="bg-background min-h-0 p-0"
      >
        <ShareContent
          onClose={() => onOpenChange(false)}
          hasPath={hasPath}
          projectId={projectId}
          onExportJson={onExportJson}
          onSharePublished={onSharePublished}
          mobile
        />
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Share"
      headerless
      maxWidth="max-w-2xl"
      panelClassName="rounded-3xl p-6"
    >
      <ShareContent
        onClose={() => onOpenChange(false)}
        hasPath={hasPath}
        projectId={projectId}
        onExportJson={onExportJson}
        onSharePublished={onSharePublished}
      />
    </DesktopModal>
  );
}
