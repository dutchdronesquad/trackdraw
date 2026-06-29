"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const viewport = { once: true, margin: "-48px" };

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.32, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function RevealListItem({
  children,
  className,
  delay = 0,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.24, ease: "easeOut", delay }}
    >
      {children}
    </motion.li>
  );
}
