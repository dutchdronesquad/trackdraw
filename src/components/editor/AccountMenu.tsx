"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, LogIn, LogOut, UserRound } from "lucide-react";
import AccountDialog from "@/components/dialogs/AccountDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function getUserDisplayName(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  return user?.name?.trim() || user?.email?.trim() || "Signed in";
}

function getUserSecondaryLabel(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  if (user?.name?.trim() && user.email?.trim()) {
    return "TrackDraw account";
  }

  return "Signed in";
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

const accountMenuItemClassName =
  "text-muted-foreground hover:text-foreground hover:bg-muted flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors";

interface AccountMenuProps {
  collapsed?: boolean;
}

export default function AccountMenu({ collapsed = false }: AccountMenuProps) {
  const { data, isPending } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const user = data?.user;

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/studio";
          },
        },
      });
    } finally {
      setSigningOut(false);
    }
  };

  if (isPending) {
    return (
      <span className="text-muted-foreground block px-3 pb-1 text-xs">
        Checking auth…
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          collapsed
            ? "text-sidebar-foreground/65 hover:border-border/80 hover:bg-muted hover:text-foreground flex h-9 w-full items-center justify-center rounded-xl border border-transparent transition-colors"
            : "text-sidebar-foreground/75 hover:border-border/80 hover:bg-muted hover:text-foreground flex h-9 w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 text-[13px] transition-all duration-200"
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <LogIn className="size-3.5" />
        </span>
        {!collapsed && <span>Sign in</span>}
      </Link>
    );
  }

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          collapsed
            ? "text-sidebar-foreground/65 hover:bg-muted hover:text-foreground flex h-9 w-full items-center justify-center rounded-xl px-0 transition-colors"
            : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-colors"
        )}
      >
        <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
          {getAvatarLabel(user)}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 text-left">
            <span className="text-foreground block truncate text-[12px] font-medium">
              {getUserDisplayName(user)}
            </span>
            <span className="text-muted-foreground block truncate pt-0.5 text-[10px]">
              {getUserSecondaryLabel(user)}
            </span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="border-border/70 bg-popover w-64 gap-0 rounded-2xl border p-0 shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
      >
        <div className="px-3 py-2.5">
          <PopoverHeader className="flex-row items-center gap-3 rounded-xl px-1 py-0.5">
            <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {getAvatarLabel(user)}
            </span>
            <div className="min-w-0 flex-1">
              <PopoverTitle className="text-foreground truncate text-[12px] font-medium">
                {getUserDisplayName(user)}
              </PopoverTitle>
              <PopoverDescription className="truncate pt-0.5 text-[11px]">
                {user?.email ?? "TrackDraw account"}
              </PopoverDescription>
            </div>
          </PopoverHeader>
        </div>
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              window.setTimeout(() => {
                setAccountOpen(true);
              }, 0);
            }}
            className={accountMenuItemClassName}
          >
            <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
              <UserRound className="size-4" />
            </span>
            <span className="flex-1">Profile</span>
          </button>
          <button type="button" className={accountMenuItemClassName}>
            <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
              <FolderKanban className="size-4" />
            </span>
            <span className="flex-1">Cloud projects</span>
          </button>
        </div>
        <div className="border-border/60 border-t p-1.5">
          <Button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            variant="ghost"
            size="sm"
            className={accountMenuItemClassName}
          >
            <LogOut className="size-4" />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </Button>
        </div>
      </PopoverContent>
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </Popover>
  );
}
