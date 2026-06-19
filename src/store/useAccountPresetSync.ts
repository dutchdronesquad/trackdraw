"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useUserPresets } from "@/store/user-presets";
import type { LayoutPreset } from "@/lib/planning/layout-presets";

async function fetchAccountPresets(): Promise<LayoutPreset[] | null> {
  try {
    const res = await fetch("/api/layout-presets");
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; presets: LayoutPreset[] };
    return data.ok ? data.presets : null;
  } catch {
    return null;
  }
}

export async function pushPresetToAccount(preset: LayoutPreset): Promise<void> {
  const res = await fetch("/api/layout-presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preset),
  });
  if (!res.ok) throw new Error(`Failed to save preset (${res.status})`);
}

async function deletePresetFromAccount(presetId: string): Promise<void> {
  const res = await fetch(`/api/layout-presets/${presetId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete preset (${res.status})`);
}

async function renamePresetInAccount(
  presetId: string,
  name: string
): Promise<void> {
  const res = await fetch(`/api/layout-presets/${presetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to rename preset (${res.status})`);
}

// Tracks which userId is currently synced in this browser session.
// Resets on sign-out so the next sign-in (same or different account) triggers a fresh fetch.
let lastSyncedUserId: string | null = null;

export function useAccountPresetSync() {
  const { data: authSession } = authClient.useSession();
  const userId = authSession?.user?.id ?? null;

  const {
    userPresets,
    setUserPresets,
    addUserPreset,
    removeUserPreset,
    renameUserPreset,
  } = useUserPresets();

  useEffect(() => {
    // Sign-out: clear the store
    if (!userId) {
      if (lastSyncedUserId !== null) {
        setUserPresets([]);
        lastSyncedUserId = null;
      }
      return;
    }

    // Already synced for this user in this session
    if (lastSyncedUserId === userId) return;

    // Account switch: clear immediately before loading the new account
    if (lastSyncedUserId !== null) {
      setUserPresets([]);
    }

    lastSyncedUserId = userId;

    fetchAccountPresets().then((presets) => {
      if (presets) setUserPresets(presets);
    });
  }, [userId, setUserPresets]);

  function addPreset(preset: Omit<LayoutPreset, "id">): string {
    if (!userId) {
      toast.error("Sign in to save presets to your account");
      return "";
    }
    const id = addUserPreset(preset);
    pushPresetToAccount({ ...preset, id }).catch(() => {
      toast.error("Failed to save preset. Please try again.");
    });
    return id;
  }

  function removePreset(id: string): void {
    removeUserPreset(id);
    if (userId) {
      deletePresetFromAccount(id).catch(() => {
        toast.error("Failed to delete preset. Please try again.");
      });
    }
  }

  function renamePreset(id: string, name: string): void {
    renameUserPreset(id, name);
    if (userId) {
      renamePresetInAccount(id, name).catch(() => {
        toast.error("Failed to rename preset. Please try again.");
      });
    }
  }

  return {
    userPresets,
    addUserPreset: addPreset,
    removeUserPreset: removePreset,
    renameUserPreset: renamePreset,
    canSavePresets: !!userId,
  };
}
