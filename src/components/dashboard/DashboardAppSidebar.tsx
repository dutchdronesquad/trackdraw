"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Mail, Users } from "lucide-react";
import DashboardNavUser from "@/components/dashboard/DashboardNavUser";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

function TrackDrawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M69.1143 154.352C71.111 164.983 66.655 174.763 61 180C52.2997 188.056 38 200 38 200H113.167C125.739 189.061 129.7 170.101 123.485 154.352C118.093 140.688 122.123 130.029 134.216 125.911C135.157 125.591 137 125.319 137 125.319L137 108C132.179 109.165 137 108 123.078 111.35C120.173 112.049 93.8158 118.051 80.5256 127.04C72.0136 132.798 67.1177 143.72 69.1143 154.352Z"
        fill="currentColor"
      />
      <path
        d="M143 48C156.807 48 168 59.1929 168 73V149C168 151.209 166.209 153 164 153H147C144.791 153 143 151.209 143 149V89C143 80.1634 135.837 73 127 73H74C65.1634 73 58 80.1634 58 89V149C58 151.209 56.2091 153 54 153H37C34.7909 153 33 151.209 33 149V73C33 59.1929 44.1929 48 58 48H143Z"
        fill="currentColor"
      />
      <rect
        x="4"
        y="4"
        width="192"
        height="192"
        rx="31"
        stroke="currentColor"
        strokeWidth="8"
      />
    </svg>
  );
}

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
  {
    title: "Email Preview",
    href: "/dashboard/email-preview",
    icon: Mail,
    activePrefix: "/dashboard/email-preview",
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
  const theme = useTheme();
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

    if (item.title === "Email Preview") {
      return currentUser.role === "admin";
    }

    return true;
  });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="hover:bg-transparent active:bg-transparent"
            >
              <div className="flex flex-1 items-center group-data-[collapsible=icon]:justify-center">
                <span className="relative block h-8 w-42 group-data-[collapsible=icon]:hidden">
                  <Image
                    src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
                    alt="TrackDraw"
                    fill
                    unoptimized
                    className="object-contain"
                    draggable={false}
                  />
                </span>
                <span className="text-foreground hidden size-8 items-center justify-center group-data-[collapsible=icon]:flex">
                  <TrackDrawMark className="size-6" />
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filteredNavItems.map((item) => {
                const isActive = isItemActive(currentPath, item);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className="hover:bg-muted/80 hover:text-foreground data-active:bg-muted data-active:text-foreground"
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DashboardNavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
