import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { toast, Toaster } from "sonner";
import ClientLanguageProvider from "@/i18n/ClientLanguageProvider";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { serializeDesign } from "@/lib/track/design";
import { ready, getErrorMessage } from "./storage/projects.mjs";
import { Workspace } from "./workspace/Workspace.jsx";
import {
  initializeWorkspace,
  createDocument,
  newDocument,
  useWorkspace,
  getRecoveryDesign,
  markProjectBackup,
} from "./workspace/workspace.mjs";
import {
  parseProjectFile,
  createImportedProjectCopy,
} from "@/lib/track/project-file";
import {
  createStarterLayoutDesign,
  starterLayouts,
} from "@/lib/planning/starter-layouts";
import { setProductAnalyticsDisabled } from "@/lib/product-events";
import "./poc.css";

const catalogs = import.meta.glob("../../../lang/en-US/*.json", {
  eager: true,
  import: "default",
});
const messages = Object.fromEntries(
  Object.entries(catalogs).map(([file, value]) => [
    file.split("/").pop().replace(".json", ""),
    value,
  ])
);
const namespaces = Object.keys(messages);
setProductAnalyticsDisabled(true);

async function openProject() {
  const result = await window.trackdrawDesktop.openProject();
  if (!result) return;
  const design = parseProjectFile(JSON.parse(result.text));
  if (!design)
    throw new Error("This file does not contain a valid TrackDraw project.");
  // Retain the current project before replacing it with the imported copy.
  await createDocument(createImportedProjectCopy(design));
  toast.success(`Opened ${result.name}`);
}

async function saveProject(id = useWorkspace.getState().activeId) {
  const design = getRecoveryDesign(id);
  if (!design) return;
  const name = await window.trackdrawDesktop.saveProject({
    text: JSON.stringify(serializeDesign(design), null, 2),
    name: design.title || "track",
  });
  if (name) {
    markProjectBackup(design);
    toast.success(`Saved ${name}`);
  }
}

function run(action) {
  void Promise.resolve()
    .then(action)
    .catch((error) => toast.error(getErrorMessage(error)));
}

class StartupBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main style={{ padding: 32 }}>
          <h1>Desktop POC could not start</h1>
          <pre>{String(this.state.error.stack || this.state.error)}</pre>
        </main>
      );
    return this.props.children;
  }
}

await ready;
initializeWorkspace();

createRoot(document.getElementById("root")).render(
  <StartupBoundary>
    <ClientLanguageProvider namespaces={namespaces} initialMessages={messages}>
      <ThemeBootstrap />
      <MotionProvider>
        <TooltipProvider delayDuration={500}>
          <Workspace
            run={run}
            onNew={() =>
              run(() => newDocument(messages.editor.desktopWorkspace.untitled))
            }
            onImport={() => run(openProject)}
            onSave={saveProject}
            onSample={() =>
              run(() =>
                createDocument(createStarterLayoutDesign(starterLayouts[0].id))
              )
            }
          />
        </TooltipProvider>
      </MotionProvider>
      <Toaster position="bottom-right" richColors />
    </ClientLanguageProvider>
  </StartupBoundary>
);
