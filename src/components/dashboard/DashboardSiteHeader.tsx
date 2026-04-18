"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type DashboardSiteHeaderProps = {
  parent?: {
    label: string;
    href: string;
  };
  title: string;
  description?: string;
};

export default function DashboardSiteHeader({
  parent,
  title,
  description,
}: DashboardSiteHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {parent ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link href={parent.href} />}>
                    {parent.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            ) : null}
            {!parent ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link href="/dashboard" />}>
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {description ? (
          <p className="text-muted-foreground ml-auto hidden text-xs lg:block">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
