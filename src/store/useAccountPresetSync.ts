"use client";

import { useEffect } from "react";
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

async function pushPresetToAccount(preset: LayoutPreset): Promise<void> {
  await fetch("/api/layout-presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preset),
  });
}

async function deletePresetFromAccount(presetId: string): Promise<void> {
  await fetch(`/api/layout-presets/${presetId}`, { method: "DELETE" });
}

async function renamePresetInAccount(
  presetId: string,
  name: string
): Promise<void> {
  await fetch(`/api/layout-presets/${presetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

let syncedForUserId: string | null = null;

export function useAccountPresetSync() {
  const { data: authSession } = authClient.useSession();
  const userId = authSession?.user?.id ?? null;

  const { userPresets, setUserPresets, addUserPreset, removeUserPreset, renameUserPreset } =
    useUserPresets();

  useEffect(() => {
    if (!userId || syncedForUserId === userId) return;
    syncedForUserId = userId;

    fetchAccountPresets().then((accountPresets) => {
      if (accountPresets) {
        setUserPresets(accountPresets);
      }
    });
  }, [userId, setUserPresets]);

  function addPreset(preset: Omit<LayoutPreset, "id">): string {
    const id = addUserPreset(preset);
    if (userId) {
      pushPresetToAccount({ ...preset, id }).catch(() => {});
    }
    return id;
  }

  function removePreset(id: string): void {
    removeUserPreset(id);
    if (userId) {
      deletePresetFromAccount(id).catch(() => {});
    }
  }

  function renamePreset(id: string, name: string): void {
    renameUserPreset(id, name);
    if (userId) {
      renamePresetInAccount(id, name).catch(() => {});
    }
  }

  return {
    userPresets,
    addUserPreset: addPreset,
    removeUserPreset: removePreset,
    renameUserPreset: renamePreset,
    isAccountBacked: !!userId,
  };
}
