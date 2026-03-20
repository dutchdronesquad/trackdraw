"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openQuestion, setOpenQuestion] = useState(items[0]?.q ?? "");

  return (
    <div className="divide-border/50 divide-y">
      {items.map((item) => {
        const isOpen = openQuestion === item.q;

        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenQuestion(isOpen ? "" : item.q)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="shrink-0"
              >
                <ChevronDown className="text-muted-foreground size-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="text-muted-foreground pb-5 text-sm leading-6">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
