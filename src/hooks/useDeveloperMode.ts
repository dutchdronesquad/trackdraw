"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const DEVELOPER_MODE_STORAGE_KEY = "trackdraw:developer-mode";

let developerModeEnabled = false;
const listeners = new Set<() => void>();

function emitDeveloperModeChange() {
  listeners.forEach((listener) => listener());
}

function persistDeveloperMode(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, "1");
  } else {
    window.localStorage.removeItem(DEVELOPER_MODE_STORAGE_KEY);
  }
}

function readStoredDeveloperMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === "1";
}

function setDeveloperModeEnabled(next: boolean) {
  if (developerModeEnabled === next) return;
  developerModeEnabled = next;
  persistDeveloperMode(next);
  emitDeveloperModeChange();
}

function subscribeDeveloperMode(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getDeveloperModeSnapshot() {
  return developerModeEnabled;
}

export function useDeveloperMode() {
  const enabled = useSyncExternalStore(
    subscribeDeveloperMode,
    getDeveloperModeSnapshot,
    () => false
  );

  const setEnabled = useCallback((next: boolean) => {
    setDeveloperModeEnabled(next);
  }, []);

  const toggle = useCallback(() => {
    setDeveloperModeEnabled(!developerModeEnabled);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    setDeveloperModeEnabled(readStoredDeveloperMode());
  }, []);

  return {
    enabled,
    setEnabled,
    toggle,
  };
}
