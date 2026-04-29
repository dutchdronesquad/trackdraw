"use client";

import { useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getAccountRoleLabel, type AccountRole } from "@/lib/account-roles";
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";

type DashboardNavUserProps = {
  user: {
    name: string;
    email: string;
    role: AccountRole;
  };
};

export default function DashboardNavUser({ user }: DashboardNavUserProps) {
  const { isMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);
  const roleLabel = getAccountRoleLabel(user.role);

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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="aria-expanded:bg-muted">
              <UserAvatar
                name={user.name}
                email={user.email}
                className="size-8 text-xs"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{roleLabel}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
              <UserAvatar
                name={user.name}
                email={user.email}
                className="size-8 text-xs"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOutIcon />
                {signingOut ? "Signing out…" : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
