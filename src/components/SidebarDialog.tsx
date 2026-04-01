"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SidebarDialogNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  tone?: "default" | "danger";
}

export interface SidebarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  mobileSubtitle?: string;
  navItems: SidebarDialogNavItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  contentTitle: string;
  contentDescription?: string;
  children: React.ReactNode;
  maxWidth?: string;
  height?: string;
}

function NavButton({
  item,
  active,
  layoutId,
  onClick,
  compact = false,
}: {
  item: SidebarDialogNavItem;
  active: boolean;
  layoutId: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-9 items-center justify-start gap-2.5 overflow-hidden text-left text-sm transition-all duration-150",
        compact
          ? "shrink-0 rounded-none px-0 py-0"
          : "w-full rounded-xl border px-2",
        active
          ? compact
            ? "text-foreground"
            : "border-brand-primary/30 bg-brand-primary/14 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : item.tone === "danger"
            ? compact
              ? "text-rose-700/85 hover:text-rose-700 dark:text-rose-300"
              : "border-transparent text-rose-700 hover:border-rose-500/20 hover:bg-rose-500/8 dark:text-rose-300"
            : compact
              ? "text-sidebar-foreground/75 hover:text-foreground"
              : "text-sidebar-foreground/75 hover:border-border/80 hover:bg-muted hover:text-foreground border-transparent"
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className={cn(
            "absolute inset-0",
            compact
              ? "bg-foreground inset-x-0 top-auto h-0.5 rounded-full"
              : "bg-brand-primary/12 rounded-xl"
          )}
          style={{ zIndex: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center",
          compact && "hidden",
          !active && item.tone === "danger" && "text-current"
        )}
      >
        {item.icon}
      </span>
      <span
        className={cn(
          "relative z-10 min-w-0 flex-1 truncate text-left text-[13px] font-normal",
          compact &&
            "flex items-center gap-1.5 px-3 pb-2.5 text-[12px] font-medium"
        )}
      >
        <span className="truncate">{item.label}</span>
        {compact && (item.badge ?? 0) > 0 ? (
          <span className="text-muted-foreground/55 shrink-0 text-[10px] font-medium tabular-nums">
            {item.badge}
          </span>
        ) : null}
      </span>
      {!compact && (item.badge ?? 0) > 0 && (
        <span className="text-muted-foreground/50 relative z-10 text-[10px] font-medium tabular-nums">
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function SidebarDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  mobileSubtitle,
  navItems,
  activeItem,
  onItemChange,
  contentTitle,
  contentDescription,
  children,
  maxWidth = "max-w-4xl",
  height = "h-[34rem]",
}: SidebarDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    const mobileNav = (
      <div className="border-border/30 px-4 pt-2.5 pb-0">
        <div className="flex min-w-full items-center gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeItem === item.id}
              layoutId="sidebarDialogMobileNavPill"
              onClick={() => onItemChange(item.id)}
              compact
            />
          ))}
        </div>
      </div>
    );

    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        subtitle={mobileSubtitle}
        contentClassName="h-[82dvh] max-h-[92dvh] min-h-[72dvh]"
        pinnedContent={
          <div className="border-border/30 shrink-0 border-b">{mobileNav}</div>
        }
        bodyClassName="pt-4 pb-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      headerless
      maxWidth={maxWidth}
      panelClassName={cn("flex overflow-hidden rounded-4xl p-0", height)}
    >
      <div className="bg-muted/30 border-border/60 flex w-52 shrink-0 flex-col border-r pt-7 pb-6">
        <div className="px-4 pb-4">
          {eyebrow && (
            <p className="text-muted-foreground/50 text-[10px] font-semibold tracking-[0.14em] uppercase">
              {eyebrow}
            </p>
          )}
          <p
            className={cn(
              "text-foreground text-lg font-semibold tracking-[-0.02em]",
              eyebrow ? "mt-1.5" : ""
            )}
          >
            {title}
          </p>
        </div>

        <div className="border-border/50 mb-3 border-t" />

        <nav className="flex-1 space-y-0.5 px-2">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeItem === item.id}
              layoutId="sidebarDialogDesktopNavPill"
              onClick={() => onItemChange(item.id)}
            />
          ))}
        </nav>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-4 px-7 pt-7 pb-4">
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <p className="text-foreground text-[15px] font-semibold tracking-[-0.01em]">
                  {contentTitle}
                </p>
                {contentDescription && (
                  <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                    {contentDescription}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground/60 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-border/30 min-h-0 flex-1 overflow-y-auto border-t px-7 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DesktopModal>
  );
}
