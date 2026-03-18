"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function shortSha(sha?: string | null) {
  if (!sha) return null;
  return sha.slice(0, 7);
}

export default function VersionTag({ className }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const sha = shortSha(process.env.NEXT_PUBLIC_COMMIT_SHA);

  return (
    <Tooltip>
      <TooltipTrigger className={cn(
        "inline-flex cursor-default select-none items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground/70 transition-colors hover:text-foreground",
        className,
      )}>
        {version}
      </TooltipTrigger>
      {sha && <TooltipContent sideOffset={4}>commit {sha}</TooltipContent>}
    </Tooltip>
  );
}
