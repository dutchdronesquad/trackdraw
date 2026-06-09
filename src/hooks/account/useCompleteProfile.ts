"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient, type AuthUser } from "@/lib/auth-client";

export function useCompleteProfile({
  readOnly,
  authUser,
}: {
  readOnly: boolean;
  authUser: AuthUser | null;
}) {
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);
  const [completeProfileDismissed, setCompleteProfileDismissed] =
    useState(false);

  useEffect(() => {
    if (readOnly || !authUser?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompleteProfileOpen(false);
      setCompleteProfileDismissed(false);
      return;
    }

    if (authUser.name?.trim()) {
      setCompleteProfileOpen(false);
      setCompleteProfileDismissed(false);
      return;
    }

    if (!completeProfileDismissed) {
      setCompleteProfileOpen(true);
    }
  }, [authUser?.id, authUser?.name, completeProfileDismissed, readOnly]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setCompleteProfileOpen(open);
      if (!open && authUser && !authUser.name?.trim()) {
        setCompleteProfileDismissed(true);
      }
    },
    [authUser]
  );

  const handleSave = useCallback(async (name: string) => {
    await authClient.updateProfileName(name);
    setCompleteProfileDismissed(false);
  }, []);

  return {
    completeProfileOpen,
    handleCompleteProfileOpenChange: handleOpenChange,
    handleCompleteProfileSave: handleSave,
  };
}
