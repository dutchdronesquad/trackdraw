"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  ArrowRight,
  Compass,
  Home,
  Images,
  ListChecks,
  Menu,
} from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { MobileDrawerHeader } from "@/components/MobileDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type PublicSiteHeaderProps = {
  currentPage?: "home" | "gallery" | "legal";
};

type NavItem = {
  key: "home" | "features" | "gallery" | "pricing" | "faq";
  label: string;
  homeHref: string;
  fallbackHref: string;
};

function MenuRow({
  href,
  label,
  description,
  icon,
  isActive,
  isFirst,
  isLast,
  onClick,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "hover:bg-muted/70 flex items-center gap-3 px-3 py-2.5 transition-colors",
        !isLast && "border-border/45 border-b",
        isFirst && "rounded-t-[0.95rem]",
        isLast && "rounded-b-[0.95rem]",
        isActive && "bg-muted/75"
      )}
    >
      <span
        className={cn(
          "bg-muted/70 text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg",
          isActive && "bg-brand-primary/12 text-brand-primary"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block text-[13px] font-medium">
          {label}
        </span>
        <span className="text-muted-foreground block truncate pt-0.5 text-[11px] leading-relaxed">
          {description}
        </span>
      </span>
    </Link>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-[0.16em] uppercase">
        {title}
      </p>
      <div className="border-border/60 bg-card overflow-hidden rounded-2xl border">
        {children}
      </div>
    </section>
  );
}

function BrandLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <span className={cn("inline-flex", className)}>
      <span className="relative block aspect-17/4 h-full dark:hidden">
        <Image
          src="/assets/brand/trackdraw-logo-color-lightbg.svg"
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </span>
      <span className="relative hidden aspect-17/4 h-full dark:block">
        <Image
          src="/assets/brand/trackdraw-logo-color-darkbg.svg"
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </span>
    </span>
  );
}

export function PublicSiteHeader({
  currentPage = "home",
}: PublicSiteHeaderProps) {
  const t = useTranslations("landing");
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const navItems: NavItem[] = [
    {
      key: "home",
      label: t("header.homeAriaLabel"),
      homeHref: "#top",
      fallbackHref: "/",
    },
    {
      key: "features",
      label: t("header.featuresNav"),
      homeHref: "#features",
      fallbackHref: "/#features",
    },
    {
      key: "gallery",
      label: t("header.galleryNav"),
      homeHref: "/gallery",
      fallbackHref: "/gallery",
    },
    {
      key: "pricing",
      label: t("header.pricingNav"),
      homeHref: "#plans",
      fallbackHref: "/#plans",
    },
    {
      key: "faq",
      label: t("header.faqNav"),
      homeHref: "#faq",
      fallbackHref: "/#faq",
    },
  ];

  const mobileNavItems = navItems.map((item) => ({
    ...item,
    href: currentPage === "home" ? item.homeHref : item.fallbackHref,
    isActive:
      (currentPage === "home" && item.key === "home") ||
      (currentPage === "gallery" && item.key === "gallery"),
    description:
      item.key === "home"
        ? t("header.homeTooltip")
        : item.key === "gallery"
          ? t("header.galleryTooltip")
          : item.key === "features"
            ? t("header.featuresTooltip")
            : item.key === "pricing"
              ? t("header.pricingTooltip")
              : t("header.faqTooltip"),
    icon:
      item.key === "home" ? (
        <Home className="size-4" />
      ) : item.key === "gallery" ? (
        <Images className="size-4" />
      ) : item.key === "features" ? (
        <Compass className="size-4" />
      ) : (
        <ListChecks className="size-4" />
      ),
  }));

  return (
    <header className="border-border/40 bg-background/75 sticky top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label={t("header.logoAriaLabel")}
          className="flex items-center"
        >
          <BrandLogo className="h-8 w-auto sm:h-9" />
        </Link>

        <div className="text-muted-foreground hidden items-center gap-7 text-sm sm:flex">
          {navItems.map((item) => {
            const href =
              currentPage === "home" ? item.homeHref : item.fallbackHref;
            const isActive =
              (currentPage === "home" && item.key === "home") ||
              (currentPage === "gallery" && item.key === "gallery");

            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  "hover:text-foreground transition-colors",
                  isActive && "text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-1">
              <LanguagePicker />
              <div className="flex h-8 w-10 items-center justify-center">
                <ThemeToggle />
              </div>
            </div>
            <Link
              href="/studio"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1E93DB] px-4 text-sm font-medium text-white shadow-md shadow-[#1E93DB]/30 transition hover:brightness-110"
            >
              {t("header.openStudio")} <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="sm:hidden">
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur();
                setOpenMobileMenu(true);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors"
              aria-label={t("header.mobileNavAriaLabel")}
            >
              <Menu className="size-4" />
            </button>

            <Drawer
              open={openMobileMenu}
              direction="right"
              modal
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  (document.activeElement as HTMLElement)?.blur();
                }
                setOpenMobileMenu(nextOpen);
              }}
            >
              <DrawerContent className="border-border/70 bg-background h-dvh w-[min(85vw,22rem)] max-w-none rounded-none border-l shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                <div className="flex h-full flex-col">
                  <MobileDrawerHeader
                    title={t("header.logoAriaLabel")}
                    subtitle={t("header.siteNavAriaLabel")}
                    className="border-border/60 bg-background"
                    headerClassName="px-4 pt-3 pb-3"
                  />

                  <div className="flex-1 overflow-y-auto px-3 py-3">
                    <MenuSection title={t("header.mobileNavAriaLabel")}>
                      {mobileNavItems.map((item, index) => (
                        <MenuRow
                          key={item.key}
                          href={item.href}
                          label={item.label}
                          description={item.description}
                          icon={item.icon}
                          isActive={item.isActive}
                          isFirst={index === 0}
                          isLast={index === mobileNavItems.length - 1}
                          onClick={() => setOpenMobileMenu(false)}
                        />
                      ))}
                    </MenuSection>
                  </div>

                  <div className="border-border/60 bg-background shrink-0 border-t px-3 py-3">
                    <div className="border-border/60 bg-card divide-border/60 divide-y rounded-2xl border px-3 py-1">
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <p className="text-[13px] font-medium">
                          {t("header.languageAriaLabel")}
                        </p>
                        <LanguagePicker
                          variant="full"
                          className="h-8 w-36 shrink-0"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-medium">
                            {t("header.themeAriaLabel")}
                          </p>
                          <p className="text-muted-foreground pt-0.5 text-[11px] leading-relaxed">
                            {t("header.themeTooltip")}
                          </p>
                        </div>
                        <ThemeToggle />
                      </div>
                    </div>

                    <Link
                      href="/studio"
                      onClick={() => setOpenMobileMenu(false)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1E93DB] px-4 text-sm font-medium text-white shadow-md shadow-[#1E93DB]/25 transition hover:brightness-110"
                    >
                      {t("header.openStudio")}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </nav>
    </header>
  );
}
