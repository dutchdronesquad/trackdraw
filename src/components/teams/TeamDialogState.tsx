"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { TeamDetails, TeamOverview, TeamErrorCode } from "@/lib/teams";

function useDialogState() {
  const [screen, setScreen] = useState<
    "overview" | "detail" | "create" | "rename" | "invite"
  >("overview");
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TeamErrorCode | null>(null);
  const [notice, setNotice] = useState(false);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  return {
    screen,
    setScreen,
    overview,
    setOverview,
    team,
    setTeam,
    selected,
    setSelected,
    name,
    setName,
    busy,
    setBusy,
    error,
    setError,
    notice,
    setNotice,
    renameDraft,
    setRenameDraft,
    email,
    setEmail,
    role,
    setRole,
    deleteConfirmation,
    setDeleteConfirmation,
    confirm,
    setConfirm,
  };
}
const TeamDialogContext = createContext<ReturnType<
  typeof useDialogState
> | null>(null);
/** Outside SidebarDialog: responsive portal replacement must not reset drafts. */
export function TeamDialogState({ children }: { children: ReactNode }) {
  const state = useDialogState();
  return (
    <TeamDialogContext.Provider value={state}>
      {children}
    </TeamDialogContext.Provider>
  );
}
export function useTeamDialogState() {
  const state = useContext(TeamDialogContext);
  if (!state) throw new Error("Team dialog state is required");
  return state;
}
