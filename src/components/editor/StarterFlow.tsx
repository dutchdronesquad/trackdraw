"use client";

import { useState } from "react";
import { Box, ChevronRight } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { starterLayouts } from "@/lib/planning/starter-layouts";
import { cn } from "@/lib/utils";

export const STARTER_STEPS = [
  {
    id: "01",
    title: "Place a few gates and obstacles",
    description: "Start small so the course structure appears quickly.",
  },
  {
    id: "02",
    title: "Draw the race path through them",
    description:
      "The path usually makes the layout click faster than obstacle tweaking alone.",
  },
  {
    id: "03",
    title: "Check 3D, then export or share",
    description:
      "Review the route early and send a read-only link when it is ready.",
  },
] as const;

export function shouldShowStarterForDesign(params: {
  title: string;
  shapeCount: number;
}) {
  const title = params.title.trim();
  return params.shapeCount === 0 && (!title || title === "New Track");
}

export function StarterSteps({ mobile = false }: { mobile?: boolean }) {
  return (
    <div>
      <p
        className={
          mobile
            ? "text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase"
            : "text-muted-foreground text-[11px] font-semibold tracking-widest uppercase"
        }
      >
        Good first steps
      </p>
      <ol className={mobile ? "space-y-3" : "mt-3 space-y-3"}>
        {STARTER_STEPS.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            <span className="text-primary/60 mt-px w-5 shrink-0 text-[11px] font-semibold tabular-nums">
              {step.id}
            </span>
            <div>
              <p
                className={
                  mobile
                    ? "text-foreground text-[13px] font-medium"
                    : "text-foreground text-[13px] font-medium"
                }
              >
                {step.title}
              </p>
              <p
                className={
                  mobile
                    ? "text-muted-foreground mt-0.5 text-[11px] leading-5"
                    : "text-muted-foreground mt-0.5 text-[12px] leading-5"
                }
              >
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StarterActions({
  mobile = false,
  onPath,
  onBlank,
  onStarterLayout,
}: {
  mobile?: boolean;
  onPath: () => void;
  onBlank: () => void;
  onStarterLayout: (layoutId: string) => void;
}) {
  const [selectedStarterId, setSelectedStarterId] = useState(
    starterLayouts[0]?.id ?? null
  );
  const selectedStarter =
    starterLayouts.find((layout) => layout.id === selectedStarterId) ??
    starterLayouts[0] ??
    null;

  if (!mobile) {
    return (
      <>
        <div className="mt-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {starterLayouts.map((layout) => {
                const selected = layout.id === selectedStarter?.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setSelectedStarterId(layout.id)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-border bg-muted text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/35 hover:text-foreground"
                    )}
                  >
                    {layout.name}
                  </button>
                );
              })}
            </div>

            {selectedStarter ? (
              <button
                type="button"
                onClick={() => onStarterLayout(selectedStarter.id)}
                className="border-border/60 bg-card hover:bg-muted/35 flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors"
              >
                <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Box className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    {selectedStarter.name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {selectedStarter.description}
                  </p>
                </div>
                <div className="flex h-full items-center self-stretch">
                  <ChevronRight className="text-muted-foreground/45 size-4 shrink-0" />
                </div>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onPath}
            className="border-primary/18 bg-primary/[0.07] text-muted-foreground hover:bg-primary/11 hover:text-foreground mt-3 flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all"
          >
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Box className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                Start with guidance
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Open an empty field with `Gate` selected so you can block out
                the course first. Draw the path once the first obstacles are
                down.
              </p>
            </div>
            <div className="flex h-full items-center self-stretch">
              <ChevronRight className="text-muted-foreground/45 size-4 shrink-0" />
            </div>
          </button>

          <button
            type="button"
            onClick={onBlank}
            className="text-muted-foreground hover:text-foreground mt-3 w-full cursor-pointer text-center text-sm underline-offset-2 transition-colors hover:underline"
          >
            Continue with empty canvas
          </button>
        </div>
        <p className="text-muted-foreground mt-5 hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:flex">
          <Kbd>G</Kbd> places gates
          <span className="text-muted-foreground/60">·</span>
          <Kbd>P</Kbd> starts the route
          <span className="text-muted-foreground/60">·</span>
          <Kbd>Enter</Kbd> finishes the path
        </p>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Starter layouts
          </p>
          <div className="space-y-2">
            {starterLayouts.map((layout) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => onStarterLayout(layout.id)}
                className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all"
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Box className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-[13px] leading-4 font-medium">
                    {layout.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] leading-4">
                    {layout.description}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground/45 mt-0.5 size-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground/60 pt-1 text-[11px] font-semibold tracking-widest uppercase">
          Guided start
        </p>

        <button
          type="button"
          onClick={onPath}
          className="border-primary/18 bg-primary/[0.07] text-muted-foreground hover:bg-primary/11 hover:text-foreground flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
        >
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Box className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[13px] font-medium">
              Start with guidance
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-5">
              Open an empty field with Gate selected. Draw the path once the
              first obstacles are down.
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/45 mt-0.5 size-4 shrink-0" />
        </button>

        <p className="text-muted-foreground/60 pt-1 text-[11px] font-semibold tracking-widest uppercase">
          Empty start
        </p>

        <button
          type="button"
          onClick={onBlank}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
        >
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
            <ChevronRight className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[13px] font-medium">
              Continue with empty canvas
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-5">
              Skip the guided start and open the empty studio instead.
            </p>
          </div>
        </button>
      </div>
    </>
  );
}
