"use client";
import {
  SidebarDialog,
  type SidebarDialogProps,
} from "@/components/SidebarDialog";
import { useTeamDialogState } from "./TeamDialogState";

/** Keep the shared account navigation in the directory, and focus mobile subflows. */
export function TeamAccountDialog(props: SidebarDialogProps) {
  const { screen } = useTeamDialogState();
  return (
    <SidebarDialog
      {...props}
      mobileContentOnly={props.activeItem === "teams" && screen !== "overview"}
    />
  );
}
