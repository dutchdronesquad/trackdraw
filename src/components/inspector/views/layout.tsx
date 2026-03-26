"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="border-border/25 text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]">
      {children}
    </span>
  );
}

export function InspectorLead({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: string[];
}) {
  return (
    <div className="space-y-2 pb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground/90 text-sm font-medium">{title}</p>
          {subtitle ? (
            <p className="text-muted-foreground/60 mt-1 text-[11px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {meta?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {meta.map((item) => (
            <MetaPill key={item}>{item}</MetaPill>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function useIsDesktopInspector() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(mediaQuery.matches);

    updateIsDesktop();
    mediaQuery.addEventListener("change", updateIsDesktop);
    return () => mediaQuery.removeEventListener("change", updateIsDesktop);
  }, []);

  return isDesktop;
}

export function InspectorScrollBody({
  children,
  mobileInline = false,
}: {
  children: ReactNode;
  mobileInline?: boolean;
}) {
  const isDesktop = useIsDesktopInspector();

  if (mobileInline && !isDesktop) {
    return <div>{children}</div>;
  }

  if (isDesktop) {
    return <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>;
  }

  return (
    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

export function InspectorFooterDesktop({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/40 bg-card hidden shrink-0 lg:block">
      <div className="bg-muted/35 border-border/30 h-px border-b" />
      {children}
    </div>
  );
}

export function InspectorFooterMobile({ children }: { children: ReactNode }) {
  return <div className="lg:hidden">{children}</div>;
}
