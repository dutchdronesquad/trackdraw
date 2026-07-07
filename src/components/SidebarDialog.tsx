"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

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
  subtitle?: string;
  mobileSubtitle?: string;
  navItems: SidebarDialogNavItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  contentTitle?: string;
  contentDescription?: string;
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  maxWidth?: string;
  height?: string;
}

function DesktopNavList({
  navItems,
  activeItem,
  onItemChange,
  sidebarFooter,
  navClassName,
}: {
  navItems: SidebarDialogNavItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  sidebarFooter?: React.ReactNode;
  navClassName?: string;
}) {
  return (
    <>
      <nav className={cn("flex-1 space-y-0.5 px-2", navClassName)}>
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

      {sidebarFooter ? (
        <div className="border-border/50 mt-4 border-t px-3 pt-4">
          {sidebarFooter}
        </div>
      ) : null}
    </>
  );
}

function CloseDialogButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground/60 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
      aria-label={label}
    >
      <X className="size-4" />
    </button>
  );
}

function AnimatedContentPanel({
  activeItem,
  children,
}: {
  activeItem: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeItem}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -2 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
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
          ? "shrink-0 gap-1.5 rounded-none px-3 pb-2.5"
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
          compact && "size-4",
          !active && item.tone === "danger" && "text-current"
        )}
      >
        {item.icon}
      </span>
      <span
        className={cn(
          "relative z-10 min-w-0 flex-1 truncate text-left text-[13px] font-normal",
          compact && "flex items-center gap-1.5 text-[12px] font-medium"
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
  subtitle,
  mobileSubtitle,
  navItems,
  activeItem,
  onItemChange,
  contentTitle,
  contentDescription,
  children,
  sidebarFooter,
  maxWidth = "max-w-4xl",
  height = "h-[34rem]",
}: SidebarDialogProps) {
  const isMobile = useIsMobile();
  const t = useTranslations("common");
  const resolvedContentTitle = contentTitle ?? title;

  if (isMobile) {
    const mobileNav = (
      <div className="border-border/30 px-4 pt-2.5 pb-0">
        <div className="flex min-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
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
        contentClassName="max-h-[92dvh]"
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

  const unified = !!subtitle;

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      headerless
      maxWidth={maxWidth}
      panelClassName={cn(
        "relative flex overflow-hidden rounded-4xl p-0",
        unified && "flex-col",
        height
      )}
    >
      {unified ? (
        <>
          <div className="flex shrink-0 items-start justify-between gap-4 px-7 pt-7 pb-4">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="text-muted-foreground/50 text-[10px] font-semibold tracking-[0.14em] uppercase">
                  {eyebrow}
                </p>
              )}
              <p
                className={cn(
                  "text-foreground text-lg font-semibold tracking-[-0.02em]",
                  eyebrow && "mt-1.5"
                )}
              >
                {title}
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {subtitle}
              </p>
            </div>
            <CloseDialogButton
              onClick={() => onOpenChange(false)}
              label={t("actions.close")}
            />
          </div>
          <div className="border-border/30 border-t" />
        </>
      ) : (
        contentDescription && (
          <div className="border-border/30 pointer-events-none absolute inset-x-0 top-[86px] z-20 border-t" />
        )
      )}

      <div className={cn("flex min-h-0 flex-1", unified && "min-h-0")}>
        <div
          className={cn(
            "flex w-52 shrink-0 flex-col border-r",
            unified
              ? "border-border/30 py-4"
              : "bg-muted/30 border-border/60 pb-6"
          )}
        >
          {!unified && (
            <>
              <div
                className={cn(
                  "border-border/30 px-4 pt-7 pb-4",
                  contentDescription && "h-[86px]"
                )}
              >
                {eyebrow && (
                  <p className="text-muted-foreground/50 text-[10px] font-semibold tracking-[0.14em] uppercase">
                    {eyebrow}
                  </p>
                )}
                <p
                  className={cn(
                    "text-foreground text-lg font-semibold tracking-[-0.02em]",
                    eyebrow && "mt-1.5"
                  )}
                >
                  {title}
                </p>
              </div>

              {!contentDescription && (
                <div className="border-border/30 mb-3 border-t" />
              )}
            </>
          )}

          <DesktopNavList
            navItems={navItems}
            activeItem={activeItem}
            onItemChange={onItemChange}
            sidebarFooter={sidebarFooter}
            navClassName={!unified && contentDescription ? "mt-3" : undefined}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!unified && (
            <div
              className={cn(
                "flex shrink-0 items-start justify-between gap-4 px-7 pt-7 pb-4",
                contentDescription && "h-[86px]"
              )}
            >
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItem}
                    initial={{ opacity: 0, x: 3 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -2 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                  >
                    <p className="text-foreground text-[15px] font-semibold tracking-[-0.01em]">
                      {resolvedContentTitle}
                    </p>
                    {contentDescription && (
                      <p className="text-muted-foreground mt-1 truncate text-[13px] leading-relaxed">
                        {contentDescription}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CloseDialogButton
                  onClick={() => onOpenChange(false)}
                  label={t("actions.close")}
                />
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <AnimatedContentPanel activeItem={activeItem}>
              {children}
            </AnimatedContentPanel>
          </div>
        </div>
      </div>
    </DesktopModal>
  );
}
