"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Shield, Users } from "lucide-react";
import DashboardNavUser from "@/components/dashboard/DashboardNavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { DashboardModule } from "@/lib/server/authorization";

type DashboardAppSidebarProps = {
  currentUser: {
    name: string;
    email: string;
    role: "user" | "moderator" | "admin";
  };
  visibleModules: DashboardModule[];
};

type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  activePrefix?: string;
  exact?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    activePrefix: "/dashboard",
    exact: true,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    activePrefix: "/dashboard/users",
  },
  {
    title: "Audit",
    href: "/dashboard/audit",
    icon: Bell,
    activePrefix: "/dashboard/audit",
  },
] as const;

function isItemActive(pathname: string, item: NavItem) {
  if (!item.activePrefix) {
    return false;
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return (
    pathname === item.activePrefix ||
    pathname.startsWith(`${item.activePrefix}/`)
  );
}

export default function DashboardAppSidebar({
  currentUser,
  visibleModules,
}: DashboardAppSidebarProps) {
  const currentPath = usePathname();
  const filteredNavItems = navItems.filter((item) => {
    if (item.title === "Overview") {
      return visibleModules.includes("overview");
    }

    if (item.title === "Users") {
      return visibleModules.includes("users");
    }

    if (item.title === "Audit") {
      return visibleModules.includes("audit");
    }

    return true;
  });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Shield className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  TrackDraw Dashboard
                </span>
                <span className="truncate text-xs">
                  {currentUser.role === "admin"
                    ? "Platform controls"
                    : "Moderation workspace"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(currentPath, item);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    disabled={item.disabled}
                    tooltip={item.title}
                    render={
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                      />
                    }
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-2 w-auto" />
      <SidebarFooter>
        <DashboardNavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
