"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/store/editor";
import { buildShareUrl, isShareSafe } from "@/lib/share";
import { Copy, Check, ExternalLink, Share2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const design = useEditor((s) => s.design);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(design);
  const safe = isShareSafe(design);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

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
        </DialogHeader>

        <div className="space-y-3">
          {!safe && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Track is very large — the URL may not work in all browsers.
                Export as JSON for a reliable backup.
              </span>
            </div>
          )}

          {/* URL field + copy */}
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="border-border bg-muted/30 text-foreground focus:ring-primary/50 min-w-0 flex-1 truncate rounded-md border px-3 py-1.5 font-mono text-xs outline-none focus:ring-1"
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

          {/* Action buttons */}
          <div
            className={cn(
              "grid gap-2",
              canNativeShare ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {canNativeShare && (
              <Button
                variant="outline"
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

          <p className="text-muted-foreground text-[11px]">
            The link contains the full track — no account needed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
