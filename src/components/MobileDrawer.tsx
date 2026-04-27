"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import {
  DrawerContent,
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
  bodyClassName?: string;
  contentClassName?: string;
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
  bodyClassName,
  contentClassName,
}: MobileDrawerProps) {
  const content = (
    <DrawerContent
      className={cn(
        "border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden",
        contentClassName
      )}
    >
      <MobileDrawerHeader title={title} subtitle={subtitle} />
      {pinnedContent}
      <div
        className={cn("flex-1 overflow-y-auto px-4 pt-3 pb-6", bodyClassName)}
      >
        {children}
      </div>
      {footerContent}
    </DrawerContent>
  );

  const drawerProps = {
    direction: "bottom" as const,
    modal: true,
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
