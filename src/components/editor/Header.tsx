"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Share2,
  Eye,
  Cloud,
  CloudOff,
  CloudUpload,
  Download,
  Keyboard,
  LoaderCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Hash,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import type { AccountDialogView } from "@/components/dialogs/AccountDialog/types";

const MobileAppMenu = dynamic(
  () => import("@/components/editor/MobileAppMenu"),
  {
    ssr: false,
  }
);

const AccountDialog = dynamic(
  () => import("@/components/dialogs/AccountDialog"),
  {
    ssr: false,
  }
);

const ThemeToggle = dynamic(
  () =>
    import("@/components/ThemeToggle").then((mod) => ({
      default: mod.ThemeToggle,
    })),
  { ssr: false }
);

const INSPECTOR_WIDTH = "21.25rem";

function parseAccountDialogView(
  value: string | null
): AccountDialogView | null {
  if (
    value === "profile" ||
    value === "security" ||
    value === "apiKeys" ||
    value === "danger"
  ) {
    return value;
  }

  return null;
}

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (t: "2d" | "3d") => void;
  onShare: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onOpenProjectManager?: () => void;
  onSaveSnapshot?: () => void;
  onOpenShortcuts?: () => void;
  readOnly?: boolean;
  hideTabsOnMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  title?: string;
  studioHref?: string;
  lastSnapshotLabel?: string | null;
  statusLabel?: string;
  statusTone?: "default" | "pending" | "syncing" | "success" | "error";
  selectionLabel?: string;
  showObstacleNumbers?: boolean;
  onToggleObstacleNumbers?: () => void;
}

export default function Header({
  tab,
  onTabChange,
  onShare,
  onExport,
  onImport,
  onOpenProjectManager,
  onSaveSnapshot,
  onOpenShortcuts,
  readOnly = false,
  collapsed,
  onToggleCollapsed,
  title = "Untitled",
  studioHref = "/studio",
  lastSnapshotLabel,
  statusLabel,
  statusTone = "default",
  showObstacleNumbers = false,
  onToggleObstacleNumbers,
}: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMobileAppMenu, setShowMobileAppMenu] = useState(false);
  const [manualAccountOpen, setManualAccountOpen] = useState(false);
  const [manualAccountInitialView, setManualAccountInitialView] =
    useState<AccountDialogView>("profile");
  const requestedAccountView = parseAccountDialogView(
    searchParams.get("account")
  );
  const accountOpen = manualAccountOpen || requestedAccountView !== null;
  const accountInitialView = requestedAccountView ?? manualAccountInitialView;

  const handleAccountOpenChange = useCallback(
    (open: boolean) => {
      setManualAccountOpen(open);

      if (!open && searchParams.has("account")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("account");
        const nextQuery = params.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      }
    },
    [pathname, router, searchParams]
  );

  const statusIcon =
    statusTone === "error" ? (
      <CloudOff className="size-3.5" />
    ) : statusTone === "pending" ? (
      <CloudUpload className="size-3.5" />
    ) : statusTone === "syncing" ? (
      <LoaderCircle className="size-3.5 animate-spin" />
    ) : (
      <Cloud className="size-3.5" />
    );
  const statusWord =
    statusTone === "error"
      ? "Failed"
      : statusTone === "pending"
        ? "Pending"
        : statusTone === "syncing"
          ? "Syncing"
          : "Synced";

  const viewToggle = (
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
  );

  const mobileTabToggle = (
    <button
      onClick={() => onTabChange(tab === "2d" ? "3d" : "2d")}
      className="text-foreground inline-flex h-8 min-w-11 items-center justify-center px-2 text-[11px] font-medium"
      aria-label={`Switch to ${tab === "2d" ? "3D" : "2D"} view`}
    >
      <span className="inline-block">{tab.toUpperCase()}</span>
    </button>
  );

  return (
    <>
      <header className="border-border bg-sidebar relative z-20 flex h-12 shrink-0 items-center gap-2 border-b px-3 select-none lg:h-11">
        <div className="flex min-w-0 flex-1 shrink-0 items-center gap-2">
          {readOnly && (
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
          )}
          {!readOnly && onToggleCollapsed && (
            <Tooltip>
              <TooltipTrigger
                onClick={() => onToggleCollapsed()}
                className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 shrink-0 items-center justify-center rounded-md transition-colors lg:flex"
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-3.5" />
                ) : (
                  <PanelLeftClose className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          )}
          <div className="flex items-center gap-2 lg:hidden">
            {mobileTabToggle}
          </div>
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

        {!readOnly && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden items-center justify-center lg:flex"
            style={{ right: INSPECTOR_WIDTH }}
          >
            <div className="flex max-w-md items-center gap-2 px-6">
              <span className="text-foreground/70 truncate text-center text-sm">
                {title}
              </span>
            </div>
          </div>
        )}

        <div className="ml-auto flex h-full shrink-0 items-center gap-1">
          <div className="mr-1 hidden lg:flex">{viewToggle}</div>

          <div className="bg-border/80 mx-1 hidden h-4 w-px lg:block" />

          {onToggleObstacleNumbers && (
            <Tooltip>
              <TooltipTrigger
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
              </TooltipTrigger>
              <TooltipContent>
                {showObstacleNumbers
                  ? "Hide obstacle numbers"
                  : "Show obstacle numbers"}
              </TooltipContent>
            </Tooltip>
          )}

          {readOnly && (
            <>
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
              <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
            </>
          )}

          {/* Undo/Redo — hidden on mobile */}
          {!readOnly && (
            <div className="hidden items-center gap-1 sm:flex">
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    "text-muted-foreground flex size-7 items-center justify-center rounded-md transition-colors",
                    canUndo
                      ? "hover:text-foreground hover:bg-muted"
                      : "pointer-events-none opacity-25"
                  )}
                  onClick={() => undo()}
                  aria-label="Undo"
                >
                  <Undo2 className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Undo{" "}
                  <span className="ml-1 font-mono text-[11px] opacity-65">
                    ⌃Z
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    "text-muted-foreground flex size-7 items-center justify-center rounded-md transition-colors",
                    canRedo
                      ? "hover:text-foreground hover:bg-muted"
                      : "pointer-events-none opacity-25"
                  )}
                  onClick={() => redo()}
                  aria-label="Redo"
                >
                  <Redo2 className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Redo{" "}
                  <span className="ml-1 font-mono text-[11px] opacity-65">
                    ⌃Y
                  </span>
                </TooltipContent>
              </Tooltip>
              {onSaveSnapshot && (
                <Tooltip>
                  <TooltipTrigger
                    className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 cursor-pointer items-center justify-center rounded-md transition-colors lg:flex"
                    onClick={onSaveSnapshot}
                    aria-label="Save snapshot"
                  >
                    <Save className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="flex flex-col gap-0.5">
                    <span>
                      Save snapshot{" "}
                      <span className="font-mono text-[11px] opacity-65">
                        ⌘S
                      </span>
                    </span>
                    {lastSnapshotLabel && (
                      <span className="opacity-60">{lastSnapshotLabel}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
              {onOpenShortcuts && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={onOpenShortcuts}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 items-center justify-center rounded-md transition-colors sm:flex"
                    aria-label="Keyboard shortcuts"
                  >
                    <Keyboard className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Keyboard shortcuts</TooltipContent>
                </Tooltip>
              )}
              {statusLabel ? (
                <>
                  <div className="bg-border/80 mx-1 hidden h-4 w-px lg:block" />
                  <Tooltip>
                    <TooltipTrigger
                      className={cn(
                        "hidden items-center gap-1 text-[10px] lg:inline-flex",
                        statusTone === "error"
                          ? "text-destructive/85"
                          : statusTone === "pending"
                            ? "text-foreground/80"
                            : statusTone === "success"
                              ? "text-primary/80"
                              : statusTone === "syncing"
                                ? "text-foreground/65"
                                : "text-muted-foreground/80"
                      )}
                      aria-label={statusLabel}
                    >
                      {statusIcon}
                      <span>{statusWord}</span>
                    </TooltipTrigger>
                    <TooltipContent>{statusLabel}</TooltipContent>
                  </Tooltip>
                </>
              ) : null}
            </div>
          )}

          {!readOnly && (
            <>
              <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
            </>
          )}

          {!readOnly && onExport && (
            <button
              onClick={onExport}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden h-8 gap-1.5 px-2 text-xs lg:inline-flex lg:h-7 lg:px-2.5"
              )}
            >
              <Download className="size-3.5" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={onShare}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden h-8 gap-1.5 px-2 text-xs lg:inline-flex lg:h-7 lg:px-2.5"
            )}
          >
            <Share2 className="size-3.5" />
            <span>Share</span>
          </button>

          {!readOnly && onImport && onExport && onOpenProjectManager ? (
            showMobileAppMenu ? (
              <MobileAppMenu
                defaultOpen
                hideTrigger
                onMenuOpenChange={(open) => {
                  if (!open) {
                    setShowMobileAppMenu(false);
                  }
                }}
                onOpenAccount={() => {
                  setManualAccountInitialView("profile");
                  setManualAccountOpen(true);
                }}
                onOpenProjects={onOpenProjectManager}
                onImport={onImport}
                onExport={onExport}
                onShare={onShare}
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.blur();
                  setShowMobileAppMenu(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors lg:hidden"
                aria-label="Open app menu"
              >
                <Menu className="size-4" />
              </button>
            )
          ) : null}

          <div className="bg-border/80 mx-1 hidden h-5 w-px lg:block lg:h-4" />
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AccountDialog
        open={accountOpen}
        onOpenChange={handleAccountOpenChange}
        initialView={accountInitialView}
        mobile
      />
    </>
  );
}
