"use client";
import {
  SidebarDialog,
  type SidebarDialogProps,
} from "@/components/SidebarDialog";
import { useTeamDialogState } from "./TeamDialogState";

/** Keep the shared account navigation in the directory, and focus mobile subflows. */
export function TeamAccountDialog(props: SidebarDialogProps) {
  const { screen, renameDraft, setRenameDraft, busy } = useTeamDialogState();
  return (
    <SidebarDialog
      {...props}
      onEscapeKeyDown={(event) => {
        if (
          props.activeItem === "teams" &&
          screen === "detail" &&
          renameDraft !== null
        ) {
          event.preventDefault();
          if (!busy) setRenameDraft(null);
        } else props.onEscapeKeyDown?.(event);
      }}
      mobileContentOnly={props.activeItem === "teams" && screen !== "overview"}
    />
  );
}
