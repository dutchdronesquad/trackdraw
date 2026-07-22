"use client";

import { useCallback, useState } from "react";
import { authClient, type AuthUser } from "@/lib/auth-client";

export function useCompleteProfile({
  readOnly,
  authUser,
}: {
  readOnly: boolean;
  authUser: AuthUser | null;
}) {
  const promptUserId =
    !readOnly && authUser?.id && !authUser.name?.trim() ? authUser.id : null;
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);
  const completeProfileOpen =
    promptUserId !== null && dismissedUserId !== promptUserId;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setDismissedUserId(null);
      } else if (promptUserId) {
        setDismissedUserId(promptUserId);
      }
    },
    [promptUserId]
  );

  const handleSave = useCallback(async (name: string) => {
    await authClient.updateProfileName(name);
    setDismissedUserId(null);
  }, []);

  return {
    completeProfileOpen,
    handleCompleteProfileOpenChange: handleOpenChange,
    handleCompleteProfileSave: handleSave,
  };
}
