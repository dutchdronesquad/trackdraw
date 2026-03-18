"use client";

import { useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import { cn } from "@/lib/utils";
import { Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import type { TrackDesign } from "@/lib/types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ParsedFile = { design: TrackDesign; shapeCount: number };

export default function ImportDialog({
  open,
  onOpenChange,
}: ImportDialogProps) {
  const { replaceDesign } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setParsed(null);
    setError(null);
  };

  const tryParse = useCallback((text: string) => {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || !Array.isArray(data.shapes))
        throw new Error();
      setParsed({
        design: data as TrackDesign,
        shapeCount: data.shapes.length,
      });
      setError(null);
    } catch {
      setError("Invalid file — this doesn't look like a TrackDraw project.");
      setParsed(null);
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        setError("Only .json files are supported.");
        setParsed(null);
        return;
      }
      file.text().then(tryParse);
    },
    [tryParse]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (!parsed) return;
    replaceDesign(parsed.design);
    onOpenChange(false);
    reset();
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                dragging
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 hover:border-border hover:bg-muted/30"
              )}
            >
              <Upload
                className={cn(
                  "size-8 transition-colors",
                  dragging ? "text-primary" : "text-muted-foreground/40"
                )}
              />
              <div className="text-center">
                <p className="text-foreground text-sm font-medium">
                  Drop a file here
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  or click to browse
                </p>
              </div>
              <span className="text-muted-foreground/40 font-mono text-[10px]">
                .json
              </span>
            </div>

            {error && (
              <div className="bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded-lg border px-3 py-2.5">
                <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                <p className="text-destructive text-xs">{error}</p>
              </div>
            )}
          </>
        ) : (
          /* Preview */
          <div className="space-y-3">
            <div className="border-border bg-muted/20 flex items-start gap-3 rounded-xl border px-4 py-3.5">
              <FileJson className="mt-0.5 size-8 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {parsed.design.title || "Untitled project"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {parsed.design.field.width} × {parsed.design.field.height} m
                  &nbsp;·&nbsp;
                  {parsed.shapeCount}{" "}
                  {parsed.shapeCount === 1 ? "object" : "objects"}
                </p>
              </div>
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400" />
            </div>
            <p className="text-muted-foreground px-0.5 text-xs">
              The current project will be replaced. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="border-border text-muted-foreground hover:bg-muted/40 flex-1 rounded-lg border px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Load
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileInput}
        />
      </DialogContent>
    </Dialog>
  );
}
