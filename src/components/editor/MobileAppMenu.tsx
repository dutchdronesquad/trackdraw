"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Download,
  FolderOpen,
  Import,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Share2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import AccountDialog from "@/components/dialogs/AccountDialog";
import { MobileDrawerHeader } from "@/components/MobileDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { authClient } from "@/lib/auth-client";

type MobileAppMenuProps = {
  onOpenProjects: () => void;
  onImport: () => void;
  onExport: () => void;
  onShare: () => void;
  onOpenAccount?: () => void;
  defaultOpen?: boolean;
  hideTrigger?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
};

function getUserDisplayName(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  fallback: string
) {
  return user?.name?.trim() || user?.email?.trim() || fallback;
}

function getAvatarLabel(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  const source = user?.name?.trim() || user?.email?.trim() || "T";
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "T";
}

function canAccessDashboard(user: unknown): boolean {
  return (
    typeof user === "object" &&
    user !== null &&
    "role" in user &&
    (user.role === "admin" || user.role === "moderator")
  );
}

function MenuRow({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/70 flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
    >
      <span className="bg-muted/70 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
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
    </button>
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

export default function MobileAppMenu({
  onOpenProjects,
  onImport,
  onExport,
  onShare,
  onOpenAccount,
  defaultOpen = false,
  hideTrigger = false,
  onMenuOpenChange,
}: MobileAppMenuProps) {
  const t = useTranslations("editor.mobileAppMenu");
  const { data } = authClient.useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [signingOut, setSigningOut] = useState(false);
  const user = data?.user;

  const setMenuOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onMenuOpenChange?.(nextOpen);
  };

  const closeAndRun = (action: () => void) => {
    setMenuOpen(false);
    window.setTimeout(action, 0);
  };

  const openAccount = () => {
    setMenuOpen(false);
    window.setTimeout(() => {
      if (onOpenAccount) {
        onOpenAccount();
        return;
      }

      setAccountOpen(true);
    }, 0);
  };

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setMenuOpen(false);
            window.location.href = "/studio";
          },
        },
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.blur();
            setMenuOpen(true);
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-md transition-colors lg:hidden"
          aria-label={t("openAppMenu")}
        >
          <Menu className="size-4" />
        </button>
      ) : null}

      <Drawer
        open={open}
        direction="right"
        modal
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            (document.activeElement as HTMLElement)?.blur();
          }
          setMenuOpen(nextOpen);
        }}
      >
        <DrawerContent className="border-border/70 bg-background h-dvh w-[min(85vw,22rem)] max-w-none rounded-none border-l shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:hidden">
          <div className="flex h-full flex-col">
            <MobileDrawerHeader
              title={t("title")}
              subtitle={t("subtitle")}
              className="border-border/60 bg-background"
              headerClassName="px-4 pt-3 pb-3"
            />

            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
              <div className="border-border/60 bg-card rounded-2xl border px-2 py-2">
                {user ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.blur();
                      openAccount();
                    }}
                    className="hover:bg-muted/70 flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors"
                  >
                    <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      {getAvatarLabel(user)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-medium">
                        {getUserDisplayName(user, t("trackdrawAccount"))}
                      </div>
                      <div className="text-muted-foreground truncate pt-0.5 text-[11px]">
                        {user.email ?? t("trackdrawAccount")}
                      </div>
                    </div>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="hover:bg-muted/70 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                  >
                    <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      <LogIn className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-[13px] font-medium">
                        {t("signIn")}
                      </div>
                      <div className="text-muted-foreground truncate pt-0.5 text-[11px]">
                        {t("yourAccount")}
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <MenuSection title={t("projectsSection")}>
                  <MenuRow
                    icon={<FolderOpen className="size-4" />}
                    label={t("projectsLabel")}
                    description={t("projectsDescription")}
                    onClick={() => closeAndRun(onOpenProjects)}
                  />
                </MenuSection>

                {user ? (
                  <MenuSection title={t("accountSection")}>
                    <MenuRow
                      icon={<UserRound className="size-4" />}
                      label={t("profileLabel")}
                      description={t("profileDescription")}
                      onClick={openAccount}
                    />
                    {canAccessDashboard(user) ? (
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="hover:bg-muted/70 flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                      >
                        <span className="bg-muted/70 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <LayoutDashboard className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block text-[13px] font-medium">
                            {t("dashboardLabel")}
                          </span>
                          <span className="text-muted-foreground block truncate pt-0.5 text-[11px] leading-relaxed">
                            {t("dashboardDescription")}
                          </span>
                        </span>
                      </Link>
                    ) : null}
                  </MenuSection>
                ) : null}

                <MenuSection title={t("shareSection")}>
                  <MenuRow
                    icon={<Share2 className="size-4" />}
                    label={t("shareLabel")}
                    description={t("shareDescription")}
                    onClick={() => closeAndRun(onShare)}
                  />
                  <MenuRow
                    icon={<Import className="size-4" />}
                    label={t("importLabel")}
                    description={t("importDescription")}
                    onClick={() => closeAndRun(onImport)}
                  />
                  <MenuRow
                    icon={<Download className="size-4" />}
                    label={t("exportLabel")}
                    description={t("exportDescription")}
                    onClick={() => closeAndRun(onExport)}
                  />
                </MenuSection>
              </div>
            </div>

            <div className="border-border/60 bg-background shrink-0 border-t px-3 py-3">
              <div className="flex items-center justify-between rounded-xl px-2 py-1.5">
                <div>
                  <div className="text-foreground text-[13px] font-medium">
                    {t("themeLabel")}
                  </div>
                  <div className="text-muted-foreground pt-0.5 text-[11px]">
                    {t("themeDescription")}
                  </div>
                </div>
                <ThemeToggle />
              </div>
              {user ? (
                <div className="border-border/60 mt-2 border-t pt-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <LogOut className="size-4" />
                    </span>
                    <span>{signingOut ? t("signingOut") : t("signOut")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {onOpenAccount ? null : (
        <AccountDialog
          open={accountOpen}
          onOpenChange={setAccountOpen}
          mobile
        />
      )}
    </>
  );
}
