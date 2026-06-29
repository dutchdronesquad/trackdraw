"use client";

import { useState } from "react";
import { Cloud, Clock, FolderOpen, Link2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";
import type { AccountShareItem } from "@/components/editor/useAccountProjectSync";
import { SidebarDialog } from "@/components/SidebarDialog";
import { ProjectManagerDeviceTab } from "./DeviceTab";
import { ProjectManagerAccountTab } from "./AccountTab";
import { ProjectManagerRestoreTab } from "./RestoreTab";
import { ProjectManagerSharesTab } from "./SharesTab";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";
import { useTranslations } from "next-intl";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewProject?: () => void;
  onOpenProject?: (id: string) => void;
  onOpenAccountProject?: (id: string) => void;
  onSyncProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteProjects?: (ids: string[]) => void;
  onRenameProject?: (id: string, title: string) => void;
  onExportProject?: (id: string) => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  onResolveConflict?: (id: string) => void;
  projects?: ProjectMeta[];
  accountProjects?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    shapeCount: number;
  }>;
  accountProjectsLoading?: boolean;
  accountProjectsError?: string | null;
  projectSyncMetaById?: Record<string, ProjectSyncMeta>;
  syncingProjectId?: string | null;
  restorePoints?: RestorePointMeta[];
  activeDesignId?: string;
  activeRestorePointId?: string;
  accountShares?: AccountShareItem[];
  accountSharesLoading?: boolean;
  onRevokeShare?: (token: string) => void;
}

type View = "device" | "account" | "restore" | "shares";

export default function ProjectManagerDialog({
  open,
  onOpenChange,
  onOpenNewProject,
  onOpenProject,
  onOpenAccountProject,
  onSyncProject,
  onDeleteProject,
  onDeleteProjects,
  onRenameProject,
  onExportProject,
  onRestorePoint,
  onDeleteRestorePoint,
  onResolveConflict,
  projects = [],
  accountProjects = [],
  accountProjectsLoading = false,
  accountProjectsError = null,
  projectSyncMetaById = {},
  syncingProjectId = null,
  restorePoints = [],
  activeDesignId,
  activeRestorePointId,
  accountShares = [],
  accountSharesLoading = false,
  onRevokeShare,
}: ProjectManagerDialogProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("device");

  const hasAccountSection = Boolean(onSyncProject);

  const accountProjectTitleById = Object.fromEntries(
    accountProjects.map((p) => [p.id, p.title])
  );

  type NavItem = {
    id: View;
    label: string;
    icon: React.ReactNode;
    count: number;
  };
  const navItems: NavItem[] = [
    {
      id: "device",
      label: t("projectManager.navThisDevice"),
      icon: <FolderOpen className="size-4" />,
      count: projects.length,
    },
    ...(hasAccountSection
      ? ([
          {
            id: "account",
            label: tCommon("labels.account"),
            icon: <Cloud className="size-4" />,
            count: accountProjects.length,
          },
          {
            id: "shares",
            label: t("projectManager.navShares"),
            icon: <Link2 className="size-4" />,
            count: accountShares.length,
          },
        ] as NavItem[])
      : []),
    {
      id: "restore",
      label: t("projectManager.navSnapshots"),
      icon: <Clock className="size-4" />,
      count: restorePoints.length,
    },
  ];

  const activeView =
    (view === "account" || view === "shares") && !hasAccountSection
      ? "device"
      : view;

  const viewMeta: Record<View, { label: string; description: string }> = {
    device: {
      label: t("projectManager.panelDevice.label"),
      description: t("projectManager.panelDevice.description"),
    },
    account: {
      label: t("projectManager.panelAccount.label"),
      description: t("projectManager.panelAccount.description"),
    },
    restore: {
      label: t("projectManager.panelSnapshots.label"),
      description: t("projectManager.panelSnapshots.description"),
    },
    shares: {
      label: t("projectManager.panelShares.label"),
      description: t("projectManager.panelShares.description"),
    },
  };

  const current = viewMeta[activeView];

  const tabContent = {
    device: (
      <ProjectManagerDeviceTab
        projects={projects}
        accountProjects={accountProjects}
        activeDesignId={activeDesignId}
        syncingProjectId={syncingProjectId}
        projectSyncMetaById={projectSyncMetaById}
        onOpenProject={onOpenProject}
        onOpenNewProject={onOpenNewProject}
        onSyncProject={onSyncProject}
        onDeleteProject={onDeleteProject}
        onDeleteProjects={onDeleteProjects}
        onRenameProject={onRenameProject}
        onExportProject={onExportProject}
        onResolveConflict={onResolveConflict}
        onOpenChange={onOpenChange}
      />
    ),
    account: (
      <ProjectManagerAccountTab
        accountProjects={accountProjects}
        loading={accountProjectsLoading}
        error={accountProjectsError}
        activeDesignId={activeDesignId}
        syncingProjectId={syncingProjectId}
        projectSyncMetaById={projectSyncMetaById}
        onOpenAccountProject={onOpenAccountProject}
        onSyncProject={onSyncProject}
        onResolveConflict={onResolveConflict}
        onOpenChange={onOpenChange}
      />
    ),
    restore: (
      <ProjectManagerRestoreTab
        restorePoints={restorePoints}
        activeRestorePointId={activeRestorePointId}
        onRestorePoint={onRestorePoint}
        onDeleteRestorePoint={onDeleteRestorePoint}
        onOpenChange={onOpenChange}
      />
    ),
    shares: (
      <ProjectManagerSharesTab
        shares={accountShares}
        loading={accountSharesLoading}
        accountProjectTitleById={accountProjectTitleById}
        onRevoke={onRevokeShare}
      />
    ),
  };

  void isMobile; // used by tab components via useIsMobile()

  return (
    <SidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={t("projectManager.dialogEyebrow")}
      title={t("projectManager.dialogTitle")}
      mobileSubtitle={t("projectManager.dialogMobileSubtitle")}
      navItems={navItems.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        badge: item.count,
      }))}
      activeItem={activeView}
      onItemChange={(id) => setView(id as View)}
      contentTitle={current.label}
      contentDescription={current.description}
    >
      {tabContent[activeView]}
    </SidebarDialog>
  );
}
