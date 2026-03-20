"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/store/editor";
import { buildShareUrl, isShareSafe } from "@/lib/share";
import {
  Copy,
  Check,
  ExternalLink,
  Share2,
  AlertTriangle,
  Link2,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportJson?: () => void;
}

export default function ShareDialog({
  open,
  onOpenChange,
  onExportJson,
}: ShareDialogProps) {
  const design = useEditor((s) => s.design);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(design);
  const safe = isShareSafe(design);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const shapeCount = design.shapes.length;
  const shareTitle = design.title.trim() || "Untitled track";
  const hostname =
    typeof window !== "undefined" ? window.location.host : "trackdraw.app";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Track</DialogTitle>
          <DialogDescription>
            Create a shareable link for this track design.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="border-border/60 bg-muted/18 overflow-hidden rounded-xl border">
            <div className="border-border/50 bg-card/70 flex items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">
                  {shareTitle}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Shared from the current studio state
                </p>
              </div>
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Share2 className="size-4" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/5">
              <div className="px-4 py-3">
                <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Field
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {design.field.width}×{design.field.height}m
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Objects
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {shapeCount}
                </p>
              </div>
            </div>
          </div>

          {!safe && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-relaxed">
                Track is very large — the URL may not work in all browsers.
                Export as JSON for a reliable backup.
              </span>
            </div>
          )}

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
                  Contains the full track in the URL on {hostname}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="share-url-input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="border-border bg-background/70 text-foreground focus:ring-primary/50 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-none focus:ring-1"
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

          <div
            className={cn(
              "grid gap-2",
              canNativeShare ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {canNativeShare && (
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleNativeShare}
              >
                <Share2 className="size-3.5" />
                Share via…
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() =>
                window.open(shareUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="size-3.5" />
              Open in tab
            </Button>
          </div>

          {onExportJson ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={onExportJson}
            >
              <Boxes className="size-3.5" />
              Export JSON instead
            </Button>
          ) : null}

          <div className="border-border/50 bg-muted/12 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px]">
            <Boxes className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Best for quick review and collaboration. Use export for long-term
              backup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
