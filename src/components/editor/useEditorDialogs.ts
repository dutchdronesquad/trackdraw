"use client";

import { useCallback, useEffect, useRef } from "react";

import { useStudioDialog } from "./StudioDialogsProvider";

type UseEditorDialogsOptions = {
  isMobile: boolean;
  setMobileToolsOpen: (open: boolean) => void;
};

export function useEditorDialogs({
  isMobile,
  setMobileToolsOpen,
}: UseEditorDialogsOptions) {
  const [shareOpen, setShareOpen] = useStudioDialog("share");
  const [exportOpen, setExportOpen] = useStudioDialog("export");
  const [importOpen, setImportOpen] = useStudioDialog("import");
  const [shortcutsOpen, setShortcutsOpen] = useStudioDialog("shortcuts");
  const [newProjectOpen, setNewProjectOpen] = useStudioDialog("new-project");
  const [projectManagerOpen, setProjectManagerOpen] =
    useStudioDialog("projects");
  const [presetPickerOpen, setPresetPickerOpen] = useStudioDialog("presets");
  const [commandPaletteOpen, setCommandPaletteOpen] =
    useStudioDialog("commands");
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
  }, [isMobile, setMobileToolsOpen, setNewProjectOpen]);

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
    commandPaletteOpen,
    setCommandPaletteOpen,
    openNewProjectDialog,
  };
}
