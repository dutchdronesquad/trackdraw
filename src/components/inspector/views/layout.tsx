"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted/25 text-muted-foreground/85 rounded-full px-2 py-0.5 text-[10px] font-medium">
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
    <div className="border-border/30 space-y-2.5 border-b pb-3">
      <div className="min-w-0">
        <p className="text-foreground text-[17px] leading-none font-semibold tracking-[-0.02em] lg:text-[15px]">
          {title}
        </p>
        {subtitle ? (
          <p className="text-muted-foreground/72 mt-2 text-[12px] leading-relaxed lg:text-[11px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {meta?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
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
