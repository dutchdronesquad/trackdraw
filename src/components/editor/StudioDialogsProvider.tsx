"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import type { AccountDialogView } from "@/components/dialogs/AccountDialog/types";
import {
  parseStudioDialog,
  studioDialogUrl,
  type StudioDialogName,
} from "@/lib/editor/dialog-links";

type StudioDialogs = ReturnType<typeof parseStudioDialog> & {
  setDialog: (dialog: StudioDialogName, open: boolean) => void;
  setAccountView: (view: AccountDialogView) => void;
};
const StudioDialogsContext = createContext<StudioDialogs | null>(null);

export function StudioDialogsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { dialog, accountView } = parseStudioDialog(
    new URLSearchParams(searchParams.toString())
  );
  const setDialog = useCallback((name: StudioDialogName, open: boolean) => {
    const current = parseStudioDialog(
      new URLSearchParams(window.location.search)
    );
    if ((!open && current.dialog !== name) || (open && current.dialog === name))
      return;
    const url = studioDialogUrl(window.location.href, open ? name : null);
    // Native history is integrated with Next's search params and does not reload the editor.
    // Closing replaces the entry, including when arriving from an external link.
    if (open && !current.dialog) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);
  const setAccountView = useCallback((view: AccountDialogView) => {
    window.history.replaceState(
      null,
      "",
      studioDialogUrl(window.location.href, "account", view)
    );
  }, []);
  const value = useMemo(
    () => ({ dialog, accountView, setDialog, setAccountView }),
    [dialog, accountView, setDialog, setAccountView]
  );
  return (
    <StudioDialogsContext.Provider value={value}>
      {children}
    </StudioDialogsContext.Provider>
  );
}

export function useStudioDialogs() {
  return useContext(StudioDialogsContext);
}

export function useStudioDialog(name: StudioDialogName) {
  const navigation = useStudioDialogs();
  const [localOpen, setLocalOpen] = useState(false);
  const setDialog = navigation?.setDialog;
  const setOpen = useCallback(
    (open: boolean) => {
      if (setDialog) setDialog(name, open);
      else setLocalOpen(open);
    },
    [name, setDialog]
  );
  return [
    navigation ? navigation.dialog === name : localOpen,
    setOpen,
  ] as const;
}
