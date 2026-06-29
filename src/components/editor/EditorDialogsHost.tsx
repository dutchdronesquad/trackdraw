"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";
import type { TrackPreview3DHandle } from "@/components/canvas/editor/TrackPreview3D";
import type { ExportDialogProps } from "@/components/dialogs/ExportDialog";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";
import type { EditorView } from "@/lib/editor/view";
import type {
  AccountShareItem,
  ProjectSyncMeta,
  ProjectVersionConflict,
} from "./useAccountProjectSync";
import type { AuthUser } from "@/lib/auth-client";

const ShareDialog = dynamic(() => import("@/components/dialogs/ShareDialog"), {
  ssr: false,
});

const ImportDialog = dynamic(
  () => import("@/components/dialogs/ImportDialog"),
  { ssr: false }
);

const ExportDialog = dynamic<ExportDialogProps>(
  () => import("@/components/dialogs/ExportDialog"),
  { ssr: false }
);

const KeyboardShortcutsDialog = dynamic(
  () => import("@/components/dialogs/KeyboardShortcutsDialog"),
  { ssr: false }
);

const CompleteProfileDialog = dynamic(
  () => import("@/components/dialogs/CompleteProfileDialog"),
  { ssr: false }
);

const ProjectVersionConflictDialog = dynamic(
  () => import("@/components/dialogs/ProjectVersionConflictDialog"),
  { ssr: false }
);

const ProjectManagerDialog = dynamic(
  () => import("@/components/dialogs/ProjectManager"),
  { ssr: false }
);

const NewProjectDialog = dynamic(
  () => import("@/components/dialogs/NewProjectDialog"),
  { ssr: false }
);

const LayoutPresetPicker = dynamic(
  () =>
    import("@/components/editor/LayoutPresetPicker").then((mod) => ({
      default: mod.LayoutPresetPicker,
    })),
  { ssr: false }
);

export interface EditorDialogsHostProps {
  isMobile: boolean;
  activeDesignId: string;

  // Share
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
  hasPath: boolean;
  shareProjectId: string | null;
  existingShareMode: boolean;
  onRefreshAccountShares: (force: boolean) => void;
  onShareExportJson: () => void;

  // Import
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onImportBeforeConfirm: () => void;
  onImportBackupCurrent: () => void;

  // Export
  exportOpen: boolean;
  onExportOpenChange: (open: boolean) => void;
  canvasRef: RefObject<TrackCanvasHandle | null>;
  preview3DRef: RefObject<TrackPreview3DHandle | null>;
  activeTab: EditorView;
  exportProjectId: string | null;
  onExportRequest3DView: () => void;

  // Shortcuts
  shortcutsOpen: boolean;
  onShortcutsOpenChange: (open: boolean) => void;

  // New project
  newProjectOpen: boolean;
  onNewProjectOpenChange: (open: boolean) => void;
  newProjectHasContent: boolean;
  onNewProject: () => void;
  onNewProjectBackup: () => void;
  onNewProjectStarterLayout: (layoutId: string) => void;

  // Project manager
  projectManagerOpen: boolean;
  onProjectManagerOpenChange: (open: boolean) => void;
  onProjectManagerOpenNewProject: () => void;
  onOpenProject?: (id: string) => void;
  onOpenAccountProject?: (id: string) => void;
  onSyncProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteProjects?: (ids: string[]) => void;
  onRenameProject?: (id: string, title: string) => void;
  onExportProject?: (id: string) => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  onRevokeShare?: (token: string) => void;
  projects?: ProjectMeta[];
  accountProjects?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    shapeCount: number;
  }>;
  accountProjectsLoading?: boolean;
  accountProjectsError?: string | null;
  accountShares?: AccountShareItem[];
  accountSharesLoading?: boolean;
  projectSyncMetaById?: Record<string, ProjectSyncMeta>;
  syncingProjectId?: string | null;
  restorePoints?: RestorePointMeta[];
  activeRestorePointId?: string;

  // Preset picker
  presetPickerOpen: boolean;
  onPresetPickerOpenChange: (open: boolean) => void;
  activePresetId: string | null;
  onSelectPreset: (id: string) => void;

  // Complete profile
  completeProfileOpen: boolean;
  onCompleteProfileOpenChange: (open: boolean) => void;
  authUser: AuthUser | null;
  onCompleteProfileSave: (name: string) => Promise<void>;

  // Version conflict
  projectVersionConflict: ProjectVersionConflict | null;
  onOpenCloudConflictVersion: () => void;
  onKeepLocalConflictCopy: () => void;
}

export function EditorDialogsHost({
  isMobile,
  activeDesignId,

  shareOpen,
  onShareOpenChange,
  hasPath,
  shareProjectId,
  existingShareMode,
  onRefreshAccountShares,
  onShareExportJson,

  importOpen,
  onImportOpenChange,
  onImportBeforeConfirm,
  onImportBackupCurrent,

  exportOpen,
  onExportOpenChange,
  canvasRef,
  preview3DRef,
  activeTab,
  exportProjectId,
  onExportRequest3DView,

  shortcutsOpen,
  onShortcutsOpenChange,

  newProjectOpen,
  onNewProjectOpenChange,
  newProjectHasContent,
  onNewProject,
  onNewProjectBackup,
  onNewProjectStarterLayout,

  projectManagerOpen,
  onProjectManagerOpenChange,
  onProjectManagerOpenNewProject,
  onOpenProject,
  onOpenAccountProject,
  onSyncProject,
  onDeleteProject,
  onDeleteProjects,
  onRenameProject,
  onExportProject,
  onRestorePoint,
  onDeleteRestorePoint,
  onRevokeShare,
  projects,
  accountProjects,
  accountProjectsLoading,
  accountProjectsError,
  accountShares,
  accountSharesLoading,
  projectSyncMetaById,
  syncingProjectId,
  restorePoints,
  activeRestorePointId,

  presetPickerOpen,
  onPresetPickerOpenChange,
  activePresetId,
  onSelectPreset,

  completeProfileOpen,
  onCompleteProfileOpenChange,
  authUser,
  onCompleteProfileSave,

  projectVersionConflict,
  onOpenCloudConflictVersion,
  onKeepLocalConflictCopy,
}: EditorDialogsHostProps) {
  const t = useTranslations("editor.shell");
  return (
    <>
      {shareOpen ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={onShareOpenChange}
          hasPath={hasPath}
          projectId={shareProjectId}
          onSharePublished={() => void onRefreshAccountShares(true)}
          existingShareMode={existingShareMode}
          onExportJson={onShareExportJson}
        />
      ) : null}

      {importOpen ? (
        <ImportDialog
          open={importOpen}
          onOpenChange={onImportOpenChange}
          onBeforeConfirm={onImportBeforeConfirm}
          onBackupCurrent={onImportBackupCurrent}
        />
      ) : null}

      {exportOpen ? (
        <ExportDialog
          open={exportOpen}
          onOpenChange={onExportOpenChange}
          canvasRef={canvasRef}
          preview3DRef={preview3DRef}
          activeTab={activeTab}
          onRequest3DView={onExportRequest3DView}
          projectId={exportProjectId}
        />
      ) : null}

      {shortcutsOpen ? (
        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={onShortcutsOpenChange}
        />
      ) : null}

      {newProjectOpen ? (
        <NewProjectDialog
          open={newProjectOpen}
          onOpenChange={onNewProjectOpenChange}
          hasContent={newProjectHasContent}
          onNewProject={onNewProject}
          onBackupProject={onNewProjectBackup}
          onStartStarterLayout={onNewProjectStarterLayout}
        />
      ) : null}

      {projectManagerOpen ? (
        <ProjectManagerDialog
          open={projectManagerOpen}
          onOpenChange={onProjectManagerOpenChange}
          onOpenNewProject={onProjectManagerOpenNewProject}
          onOpenProject={onOpenProject}
          onOpenAccountProject={onOpenAccountProject}
          onSyncProject={onSyncProject}
          onDeleteProject={onDeleteProject}
          onDeleteProjects={onDeleteProjects}
          onRenameProject={onRenameProject}
          onExportProject={onExportProject}
          onRestorePoint={onRestorePoint}
          onDeleteRestorePoint={onDeleteRestorePoint}
          projects={projects}
          accountProjects={accountProjects}
          accountProjectsLoading={accountProjectsLoading}
          accountProjectsError={accountProjectsError}
          accountShares={accountShares}
          accountSharesLoading={accountSharesLoading}
          onRevokeShare={onRevokeShare}
          projectSyncMetaById={projectSyncMetaById}
          syncingProjectId={syncingProjectId}
          restorePoints={restorePoints}
          activeDesignId={activeDesignId}
          activeRestorePointId={activeRestorePointId}
          onResolveConflict={() => onProjectManagerOpenChange(false)}
        />
      ) : null}

      {presetPickerOpen ? (
        <LayoutPresetPicker
          mobile={isMobile}
          open={presetPickerOpen}
          onOpenChange={onPresetPickerOpenChange}
          selectedPresetId={activePresetId}
          onSelectPreset={onSelectPreset}
        />
      ) : null}

      {completeProfileOpen ? (
        <CompleteProfileDialog
          open={completeProfileOpen}
          onOpenChange={onCompleteProfileOpenChange}
          email={authUser?.email ?? null}
          currentName={authUser?.name ?? ""}
          onSave={onCompleteProfileSave}
        />
      ) : null}

      {projectVersionConflict ? (
        <ProjectVersionConflictDialog
          open={Boolean(projectVersionConflict)}
          mobile={isMobile}
          title={projectVersionConflict.title ?? t("untitledFallback")}
          localUpdatedAt={projectVersionConflict.localUpdatedAt}
          cloudUpdatedAt={projectVersionConflict.cloudUpdatedAt}
          onOpenCloudVersion={onOpenCloudConflictVersion}
          onKeepLocalCopy={onKeepLocalConflictCopy}
        />
      ) : null}
    </>
  );
}
