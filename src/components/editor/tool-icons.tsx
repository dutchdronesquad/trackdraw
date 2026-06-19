import type { ReactNode } from "react";
import {
  Blocks,
  Download,
  FilePlus,
  Flag,
  FolderOpen,
  Hand,
  Import,
  MousePointer2,
  Spline,
  Target,
  Triangle,
  Type,
} from "lucide-react";
import type { EditorTool } from "@/lib/editor/tool-registry";
import { toolLabels, toolShortcuts } from "@/lib/editor/tool-registry";

function GateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
    >
      <line x1="2.5" y1="13" x2="2.5" y2="2.5" />
      <line x1="11.5" y1="13" x2="11.5" y2="2.5" />
      <line x1="2.5" y1="2.5" x2="11.5" y2="2.5" />
    </svg>
  );
}

function LadderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.5" y="1.5" width="9" height="11" />
      <line x1="2.5" y1="5.2" x2="11.5" y2="5.2" />
      <line x1="2.5" y1="8.8" x2="11.5" y2="8.8" />
    </svg>
  );
}

function TowerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="2.5,7 2.5,1.5 11.5,1.5 11.5,7" />
      <polyline points="2.5,12.5 2.5,7 11.5,7 11.5,12.5" />
    </svg>
  );
}

function DiveGateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="10" height="10" rx="0.5" />
    </svg>
  );
}

function BarrierIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Wide banner panel */}
      <rect x="1" y="2.5" width="12" height="7" rx="0.5" />
      {/* Left support post */}
      <line x1="3" y1="9.5" x2="3" y2="12.5" />
      {/* Right support post */}
      <line x1="11" y1="9.5" x2="11" y2="12.5" />
      {/* Three chevron marks */}
      <polyline points="3.5,4.2 4.8,6 3.5,7.8" strokeWidth="1.3" />
      <polyline points="6.3,4.2 7.6,6 6.3,7.8" strokeWidth="1.3" />
      <polyline points="9.1,4.2 10.4,6 9.1,7.8" strokeWidth="1.3" />
    </svg>
  );
}

function iconForTool(tool: EditorTool, className: string): ReactNode {
  switch (tool) {
    case "select":
      return <MousePointer2 className={className} />;
    case "grab":
      return <Hand className={className} />;
    case "preset":
      return <Blocks className={className} />;
    case "gate":
      return <GateIcon className={className} />;
    case "ladder":
      return <LadderIcon className={className} />;
    case "tower":
      return <TowerIcon className={className} />;
    case "divegate":
      return <DiveGateIcon className={className} />;
    case "barrier":
      return <BarrierIcon className={className} />;
    case "startfinish":
      return <Target className={className} />;
    case "flag":
      return <Flag className={className} />;
    case "cone":
      return <Triangle className={className} />;
    case "label":
      return <Type className={className} />;
    case "polyline":
      return <Spline className={className} />;
  }
}

export type ToolEntry = {
  id: EditorTool;
  label: string;
  shortcut?: string;
  icon: ReactNode;
};

export type ToolGroup = {
  title: string;
  tools: ToolEntry[];
};

export type BottomAction = {
  label: string;
  tooltip: string;
  icon: ReactNode;
  action: "new" | "projects" | "import" | "export";
};

function buildToolEntry(tool: EditorTool, iconClassName: string): ToolEntry {
  return {
    id: tool,
    label: toolLabels[tool],
    shortcut: toolShortcuts[tool],
    icon: iconForTool(tool, iconClassName),
  };
}

export const toolbarToolGroups: ToolGroup[] = [
  {
    title: "",
    tools: [
      buildToolEntry("select", "size-3.5"),
      buildToolEntry("grab", "size-3.5"),
      buildToolEntry("preset", "size-3.5"),
    ],
  },
  {
    title: "Track",
    tools: [
      buildToolEntry("gate", "size-3.5"),
      buildToolEntry("ladder", "size-3.5"),
      buildToolEntry("tower", "size-3.5"),
      buildToolEntry("divegate", "size-3.5"),
      buildToolEntry("barrier", "size-3.5"),
      buildToolEntry("flag", "size-3.5"),
      buildToolEntry("cone", "size-3.5"),
    ],
  },
  {
    title: "Extra",
    tools: [
      buildToolEntry("startfinish", "size-3.5"),
      buildToolEntry("label", "size-3.5"),
      buildToolEntry("polyline", "size-3.5"),
    ],
  },
];

export const mobileToolEntries: ToolEntry[] = [
  buildToolEntry("preset", "size-5"),
  buildToolEntry("gate", "size-5"),
  buildToolEntry("ladder", "size-5"),
  buildToolEntry("tower", "size-5"),
  buildToolEntry("divegate", "size-5"),
  buildToolEntry("barrier", "size-5"),
  buildToolEntry("startfinish", "size-5"),
  buildToolEntry("flag", "size-5"),
  buildToolEntry("cone", "size-5"),
  buildToolEntry("label", "size-5"),
  buildToolEntry("polyline", "size-5"),
];

export const bottomActions: BottomAction[] = [
  {
    label: "New",
    tooltip: "Start a new project",
    icon: <FilePlus className="size-3.5" />,
    action: "new" as const,
  },
  {
    label: "Projects",
    tooltip: "Manage projects",
    icon: <FolderOpen className="size-3.5" />,
    action: "projects" as const,
  },
  {
    label: "Import",
    tooltip: "Import JSON",
    icon: <Import className="size-3.5" />,
    action: "import" as const,
  },
  {
    label: "Export",
    tooltip: "Export track",
    icon: <Download className="size-3.5" />,
    action: "export" as const,
  },
];
