"use client";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Role = "editor" | "viewer";
export function TeamRoleSelect({
  id,
  label,
  value,
  disabled,
  onValueChange,
  className,
}: {
  id?: string;
  label: string;
  value: Role;
  disabled: boolean;
  onValueChange: (role: Role) => void;
  className?: string;
}) {
  const t = useTranslations("dialogs.teams");
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(role) => {
        if (role === "editor" || role === "viewer") onValueChange(role);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn("h-9", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="editor">{t("roles.editor")}</SelectItem>
        <SelectItem value="viewer">{t("roles.viewer")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
