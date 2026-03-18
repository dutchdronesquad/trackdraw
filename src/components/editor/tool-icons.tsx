import type { ReactNode } from "react";
import {
  Download,
  FilePlus,
  Flag,
  FolderOpen,
  Hand,
  MousePointer2,
  Spline,
  Target,
  Triangle,
  Type,
} from "lucide-react";
import type { EditorTool } from "@/lib/editor-tools";
import { toolLabels, toolShortcuts } from "@/lib/editor-tools";

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

function iconForTool(tool: EditorTool, className: string): ReactNode {
  switch (tool) {
    case "select":
      return <MousePointer2 className={className} />;
    case "grab":
      return <Hand className={className} />;
    case "gate":
      return <GateIcon className={className} />;
    case "ladder":
      return <LadderIcon className={className} />;
    case "divegate":
      return <DiveGateIcon className={className} />;
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
    case "checkpoint":
      return <Target className={className} />;
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
      buildToolEntry("select", "size-[14px]"),
      buildToolEntry("grab", "size-[14px]"),
    ],
  },
  {
    title: "Track",
    tools: [
      buildToolEntry("gate", "size-[14px]"),
      buildToolEntry("ladder", "size-[14px]"),
      buildToolEntry("divegate", "size-[14px]"),
      buildToolEntry("flag", "size-[14px]"),
      buildToolEntry("cone", "size-[14px]"),
    ],
  },
  {
    title: "Extra",
    tools: [
      buildToolEntry("startfinish", "size-[14px]"),
      buildToolEntry("label", "size-[14px]"),
      buildToolEntry("polyline", "size-[14px]"),
    ],
  },
];

export const mobileToolEntries: ToolEntry[] = [
  buildToolEntry("select", "size-5"),
  buildToolEntry("grab", "size-5"),
  buildToolEntry("gate", "size-5"),
  buildToolEntry("ladder", "size-5"),
  buildToolEntry("divegate", "size-5"),
  buildToolEntry("startfinish", "size-5"),
  buildToolEntry("flag", "size-5"),
  buildToolEntry("cone", "size-5"),
  buildToolEntry("label", "size-5"),
  buildToolEntry("polyline", "size-5"),
];

export const bottomActions = [
  {
    label: "New",
    tooltip: "New project",
    icon: <FilePlus className="size-[14px]" />,
    action: "new" as const,
  },
  {
    label: "Open",
    tooltip: "Open project",
    icon: <FolderOpen className="size-[14px]" />,
    action: "import" as const,
  },
  {
    label: "Export",
    tooltip: "Export track",
    icon: <Download className="size-[14px]" />,
    action: "export" as const,
  },
];
