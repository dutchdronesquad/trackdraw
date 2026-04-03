"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Download,
  FolderOpen,
  Import,
  LogIn,
  LogOut,
  Menu,
  Share2,
} from "lucide-react";
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
};

function getUserDisplayName(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  return user?.name?.trim() || user?.email?.trim() || "TrackDraw account";
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
      className="hover:bg-muted flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
    >
      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block text-sm font-medium">
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
    <div className="space-y-2.5">
      <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-widest uppercase">
        {title}
      </p>
      <div className="border-border/60 bg-card rounded-3xl border p-1.5">
        {children}
      </div>
    </div>
  );
}

export default function MobileAppMenu({
  onOpenProjects,
  onImport,
  onExport,
  onShare,
}: MobileAppMenuProps) {
  const { data } = authClient.useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const user = data?.user;

  const closeAndRun = (action: () => void) => {
    setOpen(false);
    window.setTimeout(action, 0);
  };

  const openAccount = () => {
    setOpen(false);
    window.setTimeout(() => {
      setAccountOpen(true);
    }, 0);
  };

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setOpen(false);
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
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.blur();
          setOpen(true);
        }}
        className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-lg transition-colors lg:hidden"
        aria-label="Open app menu"
      >
        <Menu className="size-4" />
      </button>

      <Drawer open={open} direction="right" modal onOpenChange={setOpen}>
        <DrawerContent className="border-border/70 bg-background h-dvh w-[min(85vw,22rem)] max-w-none rounded-none border-l shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:hidden">
          <div className="flex h-full flex-col">
            <MobileDrawerHeader
              title="TrackDraw"
              subtitle="Projects, sharing, account and app settings"
              className="border-border/60 bg-background"
              headerClassName="px-4 pt-4 pb-4"
            />

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="border-border/60 bg-card rounded-3xl border px-2 py-2">
                {user ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.blur();
                      openAccount();
                    }}
                    className="hover:bg-muted/70 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors"
                  >
                    <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      {getAvatarLabel(user)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-sm font-medium">
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-muted-foreground truncate pt-0.5 text-[11px]">
                        {user.email ?? "TrackDraw account"}
                      </div>
                    </div>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted/70 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors"
                  >
                    <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      <LogIn className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-sm font-medium">
                        Sign in
                      </div>
                      <div className="text-muted-foreground truncate pt-0.5 text-[11px]">
                        Your TrackDraw account
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <MenuSection title="Projects">
                  <MenuRow
                    icon={<FolderOpen className="size-4" />}
                    label="Projects"
                    description="Open and manage saved projects"
                    onClick={() => closeAndRun(onOpenProjects)}
                  />
                </MenuSection>

                <MenuSection title="Share and transfer">
                  <MenuRow
                    icon={<Share2 className="size-4" />}
                    label="Share"
                    description="Publish a read-only link for this track"
                    onClick={() => closeAndRun(onShare)}
                  />
                  <MenuRow
                    icon={<Import className="size-4" />}
                    label="Import"
                    description="Bring in a JSON project file"
                    onClick={() => closeAndRun(onImport)}
                  />
                  <MenuRow
                    icon={<Download className="size-4" />}
                    label="Export"
                    description="Download PNG, PDF, SVG or JSON"
                    onClick={() => closeAndRun(onExport)}
                  />
                </MenuSection>
              </div>
            </div>

            <div className="border-border/60 shrink-0 border-t px-3 py-3">
              <div className="flex items-center justify-between rounded-2xl px-2 py-1.5">
                <div>
                  <div className="text-foreground text-sm font-medium">
                    Theme
                  </div>
                  <div className="text-muted-foreground pt-0.5 text-[11px]">
                    Switch light, dark or system
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
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex h-10 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <LogOut className="size-4" />
                    </span>
                    <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} mobile />
    </>
  );
}
