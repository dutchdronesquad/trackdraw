"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function shortSha(sha?: string | null) {
  if (!sha) return null;
  return sha.slice(0, 7);
}

function isReleaseTag(version: string) {
  return /^v\d+\.\d+\.\d+([-.].+)?$/.test(version);
}

export default function VersionTag({ className }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const sha = shortSha(process.env.NEXT_PUBLIC_COMMIT_SHA);
  const releaseHref = isReleaseTag(version)
    ? `https://github.com/dutchdronesquad/trackdraw/releases/tag/${encodeURIComponent(version)}`
    : "https://github.com/dutchdronesquad/trackdraw/releases";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={releaseHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "border-border bg-muted text-foreground/70 hover:text-foreground inline-flex h-5 items-center gap-1 rounded-md border px-1.5 font-mono text-[11px] font-medium transition-colors select-none",
            className
          )}
        >
          <span className="inline-flex h-3 items-center leading-none">
            {version}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>
        {sha ? `commit ${sha} · ` : ""}
        Open release notes on GitHub
      </TooltipContent>
    </Tooltip>
  );
}
