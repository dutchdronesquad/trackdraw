"use client";

import Image from "next/image";
import Link from "next/link";
import { Hash, Tag } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import ViewModeSwitch from "@/components/editor/ViewModeSwitch";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (tab: "2d" | "3d") => void;
  embedMode?: boolean;
  title?: string;
  studioHref?: string;
  showObstacleNumbers?: boolean;
  onToggleObstacleNumbers?: () => void;
}

export default function Header({
  tab,
  onTabChange,
  embedMode = false,
  title = "Untitled track",
  studioHref = "/studio",
  showObstacleNumbers = false,
  onToggleObstacleNumbers,
}: HeaderProps) {
  const theme = useTheme();

  return (
    <header className="border-border bg-sidebar relative z-20 flex h-12 shrink-0 items-center gap-2 border-b px-3 select-none lg:h-11">
      <div className="flex min-w-0 flex-1 shrink-0 items-center gap-2">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="hidden shrink-0 items-center rounded-xs opacity-90 transition-opacity hover:opacity-100 lg:flex"
        >
          <span className="relative block h-7 w-37">
            <Image
              src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
              alt="TrackDraw"
              fill
              unoptimized
              className="object-contain"
              draggable={false}
            />
          </span>
        </Link>

        <ViewModeSwitch
          value={tab}
          onValueChange={onTabChange}
          size="mobile"
          className="lg:hidden"
        />
      </div>

      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:hidden">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="flex items-center rounded-xs opacity-90 transition-opacity hover:opacity-100"
        >
          <span className="relative block h-9 w-36 sm:w-40">
            <Image
              src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
              alt="TrackDraw"
              fill
              unoptimized
              className="object-contain"
              draggable={false}
            />
          </span>
        </Link>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden -translate-x-1/2 items-center justify-center lg:flex">
        <div className="flex max-w-[42vw] items-center justify-center gap-2 px-6">
          <span className="text-foreground/70 truncate text-center text-sm">
            {title}
          </span>
          <span className="text-muted-foreground/55 hidden shrink-0 text-[11px] font-medium xl:inline">
            /
          </span>
          <span className="text-muted-foreground/70 hidden shrink-0 text-[11px] font-medium xl:inline">
            {embedMode ? "Embed" : "Shared preview"}
          </span>
        </div>
      </div>

      <div className="ml-auto flex h-full shrink-0 items-center gap-1">
        <div className="mr-1 hidden lg:flex">
          <ViewModeSwitch
            value={tab}
            onValueChange={onTabChange}
            size="desktop"
          />
        </div>

        <div className="bg-border/80 mx-1 hidden h-4 w-px lg:block" />

        {onToggleObstacleNumbers ? (
          <Tooltip>
            <TooltipTrigger
              onClick={onToggleObstacleNumbers}
              className={cn(
                "text-muted-foreground hidden size-7 items-center justify-center rounded-md transition-colors lg:flex",
                showObstacleNumbers
                  ? "text-foreground hover:bg-muted"
                  : "hover:text-foreground hover:bg-muted"
              )}
              aria-label={
                showObstacleNumbers
                  ? "Hide obstacle numbers"
                  : "Show obstacle numbers"
              }
            >
              {showObstacleNumbers ? (
                <Hash className="size-3.5" />
              ) : (
                <Tag className="size-3.5" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {showObstacleNumbers
                ? "Hide obstacle numbers"
                : "Show obstacle numbers"}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {!embedMode ? (
          <>
            <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
            <Link
              href={studioHref}
              className="border-brand-primary/30 bg-brand-primary/8 text-brand-primary hover:bg-brand-primary/12 hidden h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors sm:inline-flex sm:h-7 sm:px-2.5"
            >
              Make editable copy
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
