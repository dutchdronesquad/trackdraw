"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Hash, Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (tab: "2d" | "3d") => void;
  studioHref?: string;
  showObstacleNumbers?: boolean;
  onToggleObstacleNumbers?: () => void;
}

export default function Header({
  tab,
  onTabChange,
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

        <button
          onClick={() => onTabChange(tab === "2d" ? "3d" : "2d")}
          className="text-foreground inline-flex h-8 min-w-11 items-center justify-center px-2 text-[11px] font-medium lg:hidden"
          aria-label={`Switch to ${tab === "2d" ? "3D" : "2D"} view`}
        >
          {tab.toUpperCase()}
        </button>
      </div>

      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:hidden">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="flex items-center rounded-xs opacity-90 transition-opacity hover:opacity-100"
        >
          <span className="relative block h-9 w-40">
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

      <div className="ml-auto flex h-full shrink-0 items-center gap-1">
        <div className="mr-1 hidden lg:flex">
          <div className="border-border/70 flex items-center overflow-hidden rounded-md border text-[11px] font-medium">
            <button
              onClick={() => onTabChange("2d")}
              className={cn(
                "px-2.5 py-1 transition-colors",
                tab === "2d"
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              2D
            </button>
            <div className="bg-border/60 h-full w-px self-stretch" />
            <button
              onClick={() => onTabChange("3d")}
              className={cn(
                "px-2.5 py-1 transition-colors",
                tab === "3d"
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              3D
            </button>
          </div>
        </div>

        {onToggleObstacleNumbers ? (
          <button
            onClick={onToggleObstacleNumbers}
            className={cn(
              "text-muted-foreground hidden size-7 items-center justify-center rounded-md transition-colors lg:flex",
              showObstacleNumbers
                ? "bg-muted text-foreground"
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
          </button>
        ) : null}

        <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-400 sm:flex">
          <Eye className="size-3" />
          Shared review
        </span>
        <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
        <Link
          href={studioHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden h-8 gap-1.5 px-2 text-xs sm:inline-flex sm:h-7 sm:px-2.5"
          )}
        >
          Make editable copy
        </Link>
      </div>
    </header>
  );
}
