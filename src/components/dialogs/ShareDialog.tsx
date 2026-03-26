"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/store/editor";
import { selectDesignShapeCount } from "@/store/selectors";
import { buildShareUrl, encodeDesign, isShareSafe } from "@/lib/share";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseEditorView } from "@/lib/view";
import {
  Copy,
  Check,
  ExternalLink,
  Share2,
  AlertTriangle,
  Link2,
  Boxes,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LAST_SHARE_TOKEN_KEY = "trackdraw-last-share-token";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPath?: boolean;
  onExportJson?: () => void;
}

function ShareContent({
  onClose,
  hasPath = false,
  onExportJson,
  mobile = false,
}: {
  onClose: () => void;
  hasPath?: boolean;
  onExportJson?: () => void;
  mobile?: boolean;
}) {
  const design = useEditor((s) => s.design);
  const shapeCount = useEditor(selectDesignShapeCount);
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const currentView = parseEditorView(searchParams.get("view")) ?? "2d";

  const shareUrl = buildShareUrl(design, currentView);
  const currentToken = encodeDesign(design);
  const safe = isShareSafe(design);
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
  const lastShareToken = sessionToken ?? storedToken;
  const hasChangedSinceShare =
    lastShareToken !== null && lastShareToken !== currentToken;

  const writeLastShareToken = () => {
    try {
      localStorage.setItem(LAST_SHARE_TOKEN_KEY, currentToken);
      setSessionToken(currentToken);
    } catch {
      /* ignore quota errors */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      writeLastShareToken();
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input =
        document.querySelector<HTMLInputElement>("#share-url-input");
      input?.select();
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: design.title || "TrackDraw",
        text: `Check out this FPV track: ${design.title || "Untitled"}`,
        url: shareUrl,
      });
      writeLastShareToken();
    } catch {
      /* user cancelled */
    }
  };

  if (mobile) {
    return (
      <div className="space-y-5 px-4 pt-3 pb-4">
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Current track
          </p>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {shareTitle}
            </p>
            <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
              Create a read-only review link from the current studio state.
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

        {/* Changed-since-share indicator */}
        {hasChangedSinceShare && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
            <Share2 className="mt-0.5 size-3.5 shrink-0" />
            <span className="leading-relaxed">
              Design has changed since last share — copy the link again to share
              the latest version.
            </span>
          </div>
        )}

        {/* Too-large warning */}
        {!safe && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span className="leading-relaxed">
              Track is very large — the URL may not work in all browsers. Export
              as JSON for a reliable backup.
            </span>
          </div>
        )}

        {/* Link row */}
        <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
              <Link2 className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">
                Shareable link
              </p>
              <p className="text-muted-foreground text-[11px]">
                Contains the full track and opens in {currentView.toUpperCase()}{" "}
                on {hostname}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="border-border bg-background/70 text-foreground focus:ring-primary/50 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
            />
            <Button
              size="icon-sm"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
              title="Copy link"
            >
              {copied ? (
                <Check className="size-3.5 text-green-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
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
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="border-border/40 hover:bg-muted/40 flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
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
          <button
            onClick={() =>
              window.open(shareUrl, "_blank", "noopener,noreferrer")
            }
            className={cn(
              "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
              onExportJson ? "border-border/40 border-b" : ""
            )}
          >
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <ExternalLink className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">Open in tab</p>
              <p className="text-muted-foreground text-[11px]">
                Preview the share link in a new window
              </p>
            </div>
          </button>
          {onExportJson && (
            <button
              onClick={onExportJson}
              className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Studio
          </p>
          <p className="text-foreground mt-2 text-[1.1rem] font-semibold tracking-[-0.02em]">
            Share Track
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Create a shareable link for this track design.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground/75 hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Full-width warnings */}
      {hasChangedSinceShare && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
          <Share2 className="mt-0.5 size-3.5 shrink-0" />
          <span className="leading-relaxed">
            Design has changed since last share — copy the link again to share
            the latest version.
          </span>
        </div>
      )}
      {!safe && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="leading-relaxed">
            Track is very large — the URL may not work in all browsers. Export
            as JSON for a reliable backup.
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

          {/* Link row */}
          <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
                <Link2 className="text-muted-foreground size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  Shareable link
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Opens on {hostname}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="share-url-input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="border-border bg-background/70 text-foreground focus:ring-primary/50 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
              />
              <Button
                size="icon-sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
                title="Copy link"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
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
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="border-border/40 hover:bg-muted/40 flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
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
            <button
              onClick={() =>
                window.open(shareUrl, "_blank", "noopener,noreferrer")
              }
              className={cn(
                "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
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
            {onExportJson && (
              <button
                onClick={onExportJson}
                className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
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
  onExportJson,
}: ShareDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Share"
        subtitle="Share a read-only review link for this track"
        contentClassName="border-border/60 bg-background shadow-[0_-18px_40px_rgba(0,0,0,0.18)]"
        bodyClassName="bg-background min-h-0 p-0"
      >
        <ShareContent
          onClose={() => onOpenChange(false)}
          hasPath={hasPath}
          onExportJson={onExportJson}
          mobile
        />
      </MobileDrawer>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/10 px-5 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="border-border/50 bg-card/97 pointer-events-auto w-full max-w-2xl overflow-hidden rounded-3xl border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <ShareContent
          onClose={() => onOpenChange(false)}
          hasPath={hasPath}
          onExportJson={onExportJson}
        />
      </div>
    </div>
  );
}
