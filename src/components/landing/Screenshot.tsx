"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// ── Section screenshot — scroll-triggered reveal, hover lift ──
export function Screenshot({
  src,
  alt,
  aspect = "landscape",
  accentClassName = "",
  frameClassName = "",
  imageClassName = "",
  className = "",
}: {
  src: string;
  alt: string;
  aspect?: "landscape" | "portrait";
  accentClassName?: string;
  frameClassName?: string;
  imageClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isPortrait = aspect === "portrait";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className={`relative ${className}`}
    >
      {isPortrait ? (
        <div className={`relative mx-auto w-full ${frameClassName}`}>
          <div
            className={`pointer-events-none absolute inset-x-8 top-8 bottom-10 rounded-full opacity-70 blur-3xl ${accentClassName || "bg-brand-primary/18"}`}
          />
          <div className="bg-canvas/92 relative mx-auto overflow-hidden rounded-[2.35rem] border-[7px] border-slate-800/85 shadow-[0_24px_72px_rgba(0,0,0,0.32)] ring-1 ring-white/8 transition-shadow duration-300 hover:shadow-[0_34px_88px_rgba(0,0,0,0.4)] dark:border-slate-700/80">
            <div className="absolute top-20 -left-[10px] h-10 w-[2px] rounded-l-lg bg-slate-700/90 dark:bg-slate-600/80" />
            <div className="absolute top-[8.25rem] -left-[10px] h-12 w-[2px] rounded-l-lg bg-slate-700/90 dark:bg-slate-600/80" />
            <div className="absolute top-[11.75rem] -left-[10px] h-12 w-[2px] rounded-l-lg bg-slate-700/90 dark:bg-slate-600/80" />
            <div className="absolute top-[7.5rem] -right-[10px] h-16 w-[2px] rounded-r-lg bg-slate-700/90 dark:bg-slate-600/80" />

            <div className="overflow-hidden rounded-[1.9rem] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className={`block h-auto w-full ${imageClassName}`}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5 transition-shadow duration-300 hover:shadow-[0_32px_72px_rgba(0,0,0,0.5)] ${frameClassName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`block h-auto w-full ${imageClassName}`}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ScreenshotPlaceholder({
  title,
  filename,
  note,
  badge,
  aspect = "landscape",
  accentClassName = "from-brand-primary/16 via-brand-primary/6 to-transparent",
  frameClassName = "",
  className = "",
}: {
  title: string;
  filename: string;
  note: string;
  badge?: string;
  aspect?: "landscape" | "portrait";
  accentClassName?: string;
  frameClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isPortrait = aspect === "portrait";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={`relative ${className}`}
    >
      <div
        className={`border-border/60 bg-card/35 from-background via-muted/18 to-background relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br shadow-[0_24px_60px_rgba(0,0,0,0.18)] ring-1 ring-white/5 ${frameClassName}`}
      >
        <div className={`h-16 bg-gradient-to-br ${accentClassName}`} />

        <div className="px-5 py-5">
          <div
            className={`border-border/60 bg-background/55 relative overflow-hidden rounded-[1.35rem] border border-dashed ${
              isPortrait
                ? "mx-auto aspect-[9/18] max-w-[250px]"
                : "aspect-[16/10] w-full"
            }`}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
            {isPortrait ? (
              <div className="bg-foreground/12 absolute top-3 left-1/2 h-2.5 w-20 -translate-x-1/2 rounded-full" />
            ) : null}
            <div className="border-border/50 absolute inset-x-4 top-4 h-10 rounded-xl border border-dashed" />
            <div className="border-border/50 absolute right-4 bottom-4 left-4 h-14 rounded-xl border border-dashed opacity-80" />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
              Screenshot Placeholder
            </p>
            {badge ? (
              <span className="border-border/60 bg-muted/65 text-muted-foreground rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase">
                {badge}
              </span>
            ) : null}
          </div>

          <h3 className="text-foreground mt-3 text-lg font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-6">{note}</p>

          <div className="border-border/60 bg-background/72 mt-4 rounded-2xl border px-3 py-2.5 backdrop-blur-sm">
            <p className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
              Planned Asset
            </p>
            <p className="text-foreground mt-1 font-mono text-sm">{filename}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
