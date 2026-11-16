import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function AuthPageFrame({
  homeLabel,
  headerAction,
  children,
}: {
  homeLabel: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="bg-brand-primary/10 absolute top-16 left-1/2 hidden h-72 w-72 -translate-x-[135%] rounded-full blur-3xl sm:block" />
      <div className="bg-brand-secondary/10 absolute right-0 bottom-10 hidden h-80 w-80 translate-x-1/4 rounded-full blur-3xl sm:block" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center rounded-sm opacity-90 transition-opacity hover:opacity-100"
            aria-label={homeLabel}
          >
            <span className="relative block h-8 w-36 sm:h-9 sm:w-40">
              <Image
                src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                alt=""
                fill
                priority
                unoptimized
                className="object-contain dark:hidden"
                draggable={false}
              />
              <Image
                src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                alt=""
                fill
                priority
                unoptimized
                className="hidden object-contain dark:block"
                draggable={false}
              />
            </span>
          </Link>
          {headerAction}
        </header>

        <div className="flex flex-1 items-center py-6 sm:py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)] lg:gap-14">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
