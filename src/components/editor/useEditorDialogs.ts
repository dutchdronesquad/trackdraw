"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseEditorDialogsOptions = {
  isMobile: boolean;
  setMobileToolsOpen: (open: boolean) => void;
};

export function useEditorDialogs({
  isMobile,
  setMobileToolsOpen,
}: UseEditorDialogsOptions) {
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const mobileNewProjectTimerRef = useRef<number | null>(null);

  const openNewProjectDialog = useCallback(() => {
    if (!isMobile) {
      setNewProjectOpen(true);
      return;
    }

    setMobileToolsOpen(false);

    if (mobileNewProjectTimerRef.current !== null) {
      window.clearTimeout(mobileNewProjectTimerRef.current);
    }

    mobileNewProjectTimerRef.current = window.setTimeout(() => {
      setNewProjectOpen(true);
      mobileNewProjectTimerRef.current = null;
    }, 180);
  }, [isMobile, setMobileToolsOpen]);

  useEffect(() => {
    return () => {
      if (mobileNewProjectTimerRef.current !== null) {
        window.clearTimeout(mobileNewProjectTimerRef.current);
      }
    };
  }, []);

  return {
    shareOpen,
    setShareOpen,
    exportOpen,
    setExportOpen,
    importOpen,
    setImportOpen,
    shortcutsOpen,
    setShortcutsOpen,
    newProjectOpen,
    setNewProjectOpen,
    projectManagerOpen,
    setProjectManagerOpen,
    presetPickerOpen,
    setPresetPickerOpen,
    openNewProjectDialog,
  };
}
