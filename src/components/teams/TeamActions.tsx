"use client";
import { accountInteractionClassName } from "@/components/dialogs/AccountDialog/interaction-style";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

export function TeamActions({
  label,
  busy,
  children,
}: {
  label: string;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-10 shrink-0"
          disabled={busy}
          aria-label={label}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={accountInteractionClassName}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
