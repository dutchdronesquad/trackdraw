"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  pinnedContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  nested?: boolean;
  repositionInputs?: boolean;
  handleOnly?: boolean;
  bodyClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
}

interface MobileDrawerHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  headerClassName?: string;
}

export function MobileDrawerHeader({
  title,
  subtitle,
  className,
  headerClassName,
}: MobileDrawerHeaderProps) {
  return (
    <div
      className={cn(
        "border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-xs",
        className
      )}
    >
      <DrawerHeader className={cn("px-4 pt-3 pb-3 text-left", headerClassName)}>
        <div className="min-w-0">
          <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
            {title}
          </DrawerTitle>
          {subtitle ? (
            <DrawerDescription className="text-muted-foreground/80 pt-0.5 text-[11px] leading-relaxed">
              {subtitle}
            </DrawerDescription>
          ) : null}
        </div>
      </DrawerHeader>
    </div>
  );
}

export function MobileDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  pinnedContent,
  footerContent,
  nested = false,
  repositionInputs = false,
  handleOnly = true,
  bodyClassName,
  contentClassName,
  overlayClassName,
}: MobileDrawerProps) {
  const content = (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay
        data-slot="mobile-drawer-overlay"
        className={cn(
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/20",
          overlayClassName
        )}
      />
      <DrawerPrimitive.Content
        data-slot="mobile-drawer-content"
        className={cn(
          "group/drawer-content border-border/50 bg-card fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-[1.35rem] border text-sm shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden",
          contentClassName
        )}
      >
        <DrawerPrimitive.Handle className="mx-auto mt-3 h-1 w-25 shrink-0 self-center rounded-full bg-black/14 dark:bg-white/72" />
        <MobileDrawerHeader title={title} subtitle={subtitle} />
        {pinnedContent}
        <div
          className={cn(
            "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pt-3 pb-6 [-webkit-overflow-scrolling:touch]",
            bodyClassName
          )}
        >
          {children}
        </div>
        {footerContent}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );

  const drawerProps = {
    direction: "bottom" as const,
    modal: true,
    handleOnly,
    onOpenChange,
    open,
    repositionInputs,
  };

  if (nested) {
    return (
      <DrawerPrimitive.NestedRoot {...drawerProps}>
        {content}
      </DrawerPrimitive.NestedRoot>
    );
  }

  return (
    <DrawerPrimitive.Root {...drawerProps}>{content}</DrawerPrimitive.Root>
  );
}
