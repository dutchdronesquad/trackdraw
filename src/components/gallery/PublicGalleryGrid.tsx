"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Grid2X2, Ruler, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicGalleryEntry } from "@/lib/server/gallery";
import { getSiteMediaUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

type PublicGalleryGridProps = {
  entries: PublicGalleryEntry[];
  mediaBaseUrl?: string;
};

const RECENT_PAGE_SIZE = 12;

function TrackDrawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M69.1143 154.352C71.111 164.983 66.655 174.763 61 180C52.2997 188.056 38 200 38 200H113.167C125.739 189.061 129.7 170.101 123.485 154.352C118.093 140.688 122.123 130.029 134.216 125.911C135.157 125.591 137 125.319 137 125.319L137 108C132.179 109.165 137 108 123.078 111.35C120.173 112.049 93.8158 118.051 80.5256 127.04C72.0136 132.798 67.1177 143.72 69.1143 154.352Z"
        fill="currentColor"
      />
      <path
        d="M143 48C156.807 48 168 59.1929 168 73V149C168 151.209 166.209 153 164 153H147C144.791 153 143 151.209 143 149V89C143 80.1634 135.837 73 127 73H74C65.1634 73 58 80.1634 58 89V149C58 151.209 56.2091 153 54 153H37C34.7909 153 33 151.209 33 149V73C33 59.1929 44.1929 48 58 48H143Z"
        fill="currentColor"
      />
      <rect
        x="4"
        y="4"
        width="192"
        height="192"
        rx="31"
        stroke="currentColor"
        strokeWidth="8"
      />
    </svg>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Recently added";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatFieldSize(entry: PublicGalleryEntry) {
  if (entry.fieldWidth == null || entry.fieldHeight == null) {
    return "Field size not set";
  }

  return `${entry.fieldWidth} x ${entry.fieldHeight} m`;
}

function getOwnerLabel(entry: PublicGalleryEntry) {
  return entry.ownerName?.trim() || "TrackDraw pilot";
}

function buildMediaUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

function getPreviewUrl(entry: PublicGalleryEntry, mediaBaseUrl: string) {
  if (!entry.galleryPreviewImage) {
    return null;
  }

  if (entry.galleryPreviewImage.startsWith("http")) {
    return entry.galleryPreviewImage;
  }

  return buildMediaUrl(mediaBaseUrl, entry.galleryPreviewImage);
}

function GalleryCard({
  entry,
  mediaBaseUrl,
  imageFailed,
  onImageError,
}: {
  entry: PublicGalleryEntry;
  mediaBaseUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
}) {
  const previewUrl = getPreviewUrl(entry, mediaBaseUrl);

  return (
    <Link
      href={`/share/${entry.shareToken}`}
      className="group border-border/55 bg-background/72 hover:border-border relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border shadow-[0_16px_34px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.12)]"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-20 rounded-full bg-[radial-gradient(circle,rgba(var(--brand-primary-rgb),0.16),transparent_70%)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(var(--brand-primary-rgb),0.24),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(var(--brand-secondary-rgb),0.22),transparent_48%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.74))]">
        {previewUrl && !imageFailed ? (
          <Image
            src={previewUrl}
            alt={entry.galleryTitle}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            onError={onImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-24 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/6 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
              <TrackDrawMark className="size-14" />
            </div>
          </div>
        )}
        {entry.galleryState === "featured" ? (
          <div className="absolute inset-x-0 top-0 flex items-start p-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-300 px-2.5 py-1 text-[11px] font-semibold text-slate-950 shadow-sm">
              <Sparkles className="size-3" />
              Featured
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold transition-colors group-hover:text-[--brand-primary]">
            {entry.galleryTitle}
          </h2>
          <p className="text-muted-foreground mt-1 truncate text-sm">
            by {getOwnerLabel(entry)}
          </p>
        </div>

        <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
          {entry.galleryDescription}
        </p>

        <div className="mt-auto flex flex-wrap gap-2">
          <span className="border-border/55 bg-muted/28 text-muted-foreground inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <Ruler className="size-3" />
            <span className="truncate">{formatFieldSize(entry)}</span>
          </span>
          <span className="border-border/55 bg-muted/28 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <Grid2X2 className="size-3" />
            {entry.shapeCount} obstacles
          </span>
        </div>

        <div className="border-border/45 flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-muted-foreground text-[11px]">
            Published {formatDate(entry.galleryPublishedAt)}
          </p>
          <div className="flex shrink-0 items-center gap-1 font-medium text-[--brand-primary]">
            Open
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PublicGalleryGrid({
  entries,
  mediaBaseUrl = getSiteMediaUrl(""),
}: PublicGalleryGridProps) {
  const [visibleRecentCount, setVisibleRecentCount] =
    useState(RECENT_PAGE_SIZE);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const featuredEntries = useMemo(
    () => entries.filter((entry) => entry.galleryState === "featured"),
    [entries]
  );
  const recentEntries = useMemo(
    () => entries.filter((entry) => entry.galleryState !== "featured"),
    [entries]
  );
  const visibleRecentEntries = recentEntries.slice(0, visibleRecentCount);
  const canLoadMore = recentEntries.length > visibleRecentEntries.length;

  if (entries.length === 0) {
    return (
      <div className="border-border/60 bg-muted/18 flex flex-col items-center rounded-[1.6rem] border border-dashed px-6 py-16 text-center">
        <div className="text-muted-foreground bg-background/40 flex size-18 items-center justify-center rounded-full border border-dashed">
          <TrackDrawMark className="size-10" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">No tracks yet.</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
          Gallery listings will appear here once TrackDraw pilots choose to
          share them publicly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {featuredEntries.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[--brand-secondary]" />
              <h2 className="text-lg font-semibold">Featured</h2>
            </div>
            <p className="text-muted-foreground text-sm sm:text-right">
              Hand-picked layouts at the top of the gallery.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredEntries.map((entry) => (
              <GalleryCard
                key={entry.id}
                entry={entry}
                mediaBaseUrl={mediaBaseUrl}
                imageFailed={failedImages[entry.id] ?? false}
                onImageError={() =>
                  setFailedImages((current) => ({
                    ...current,
                    [entry.id]: true,
                  }))
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {recentEntries.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-[--brand-primary]" />
              <h2 className="text-lg font-semibold">Recent</h2>
            </div>
            <p className="text-muted-foreground text-sm sm:text-right">
              Newly listed layouts from the community.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleRecentEntries.map((entry) => (
              <GalleryCard
                key={entry.id}
                entry={entry}
                mediaBaseUrl={mediaBaseUrl}
                imageFailed={failedImages[entry.id] ?? false}
                onImageError={() =>
                  setFailedImages((current) => ({
                    ...current,
                    [entry.id]: true,
                  }))
                }
              />
            ))}
          </div>
          {canLoadMore ? (
            <div className="flex justify-center pt-3">
              <Button
                variant="outline"
                onClick={() =>
                  setVisibleRecentCount((count) => count + RECENT_PAGE_SIZE)
                }
                className={cn(
                  "border-border/60 bg-background/72 min-w-36 rounded-full px-5"
                )}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
