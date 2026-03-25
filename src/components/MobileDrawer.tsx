"use client";

import * as React from "react";
import {
  Drawer,
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
  bodyClassName?: string;
  contentClassName?: string;
}

export function MobileDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  pinnedContent,
  bodyClassName,
  contentClassName,
}: MobileDrawerProps) {
  return (
    <Drawer open={open} direction="bottom" modal onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden [&>div:first-child]:hidden",
          contentClassName
        )}
      >
        <div className="border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-xs">
          <div className="flex items-center justify-center pt-2.5 pb-1.5">
            <div className="bg-primary/20 h-1 w-10 rounded-full" />
          </div>
          <DrawerHeader className="px-4 pt-0 pb-3 text-left">
            <div className="min-w-0">
              <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
                {title}
              </DrawerTitle>
              {subtitle ? (
                <DrawerDescription className="text-muted-foreground/80 pt-0.5 text-[10px] leading-relaxed">
                  {subtitle}
                </DrawerDescription>
              ) : null}
            </div>
          </DrawerHeader>
        </div>
        {pinnedContent}
        <div
          className={cn("flex-1 overflow-y-auto px-4 pt-3 pb-6", bodyClassName)}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
