import React, { Component, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { toast, Toaster } from "sonner";
import EditorShell from "@/components/editor/EditorShell";
import { StudioDialogsProvider } from "@/components/editor/StudioDialogsProvider";
import ClientLanguageProvider from "@/i18n/ClientLanguageProvider";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEditor } from "@/store/editor";
import { parseDesign, serializeDesign } from "@/lib/track/design";
import {
  ready,
  saveDesign,
  getState,
  getError,
  subscribe,
} from "./storage/projects.mjs";
import { nanoid } from "nanoid";
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
  const design = parseDesign(JSON.parse(result.text));
  if (!design)
    throw new Error("This file does not contain a valid TrackDraw project.");
  // Retain the current project before replacing it with the imported copy.
  await saveDesign(useEditor.getState().track.design, true);
  design.id = nanoid();
  design.createdAt = design.updatedAt = new Date().toISOString();
  await saveDesign(design);
  useEditor.getState().replaceDesign(design);
  useEditor.getState().clearHistory();
  toast.success(`Opened ${result.name}`);
}

async function saveProject() {
  const design = useEditor.getState().track.design;
  const name = await window.trackdrawDesktop.saveProject({
    text: JSON.stringify(serializeDesign(design), null, 2),
    name: design.title || "track",
  });
  if (name) {
    toast.success(`Saved ${name}`);
    // An explicit disk backup must remain possible when browser storage is full.
    try {
      await saveDesign(design);
    } catch {
      toast.warning("Project copy saved; local autosave is unavailable.");
    }
  }
}

function run(action) {
  void Promise.resolve()
    .then(action)
    .catch((error) => toast.error(error.message));
}

function DesktopBar() {
  const [status, setStatus] = useState("Opening desktop database…");
  useEffect(() => {
    const stopMenu = window.trackdrawDesktop.onMenuAction((action) =>
      run(action === "open" ? openProject : saveProject)
    );
    const stopStore = useEditor.subscribe((state, previous) => {
      if (state.track.design !== previous.track.design)
        setStatus("Saving locally…");
    });
    const updateStatus = () => {
      const current = useEditor.getState().track.design;
      const draft = getState().draft;
      if (getError()) {
        setStatus("Local save failed · export a project copy");
        return;
      }
      setStatus(
        draft?.id === current.id && draft.updatedAt === current.updatedAt
          ? "Saved locally · SQLite"
          : "Saving locally…"
      );
    };
    const stopRepository = subscribe(updateStatus);
    updateStatus();
    const stopClose = window.trackdrawDesktop.onCloseRequested(() =>
      run(async () => {
        await saveDesign(useEditor.getState().track.design);
        await window.trackdrawDesktop.finishClose();
      })
    );
    return () => {
      stopMenu();
      stopStore();
      stopRepository();
      stopClose();
    };
  }, []);

  return (
    <header className="poc-bar">
      <strong>Desktop Alpha</strong>
      <span>Offline only · cloud and online maps unavailable</span>
      <button onClick={() => run(openProject)}>Open project copy…</button>
      <button onClick={() => run(saveProject)}>Save project copy as…</button>
      <button
        onClick={() =>
          run(async () => {
            await saveDesign(useEditor.getState().track.design, true);
            const sample = createStarterLayoutDesign(starterLayouts[0].id);
            await saveDesign(sample);
            useEditor.getState().replaceDesign(sample);
          })
        }
      >
        Load sample
      </button>
      <span role="status" className="poc-status">
        {status}
      </span>
    </header>
  );
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

createRoot(document.getElementById("root")).render(
  <StartupBoundary>
    <ClientLanguageProvider namespaces={namespaces} initialMessages={messages}>
      <ThemeBootstrap />
      <MotionProvider>
        <TooltipProvider delayDuration={500}>
          <DesktopBar />
          <div className="poc-editor">
            <StudioDialogsProvider>
              <EditorShell />
            </StudioDialogsProvider>
          </div>
        </TooltipProvider>
      </MotionProvider>
      <Toaster position="bottom-right" richColors />
    </ClientLanguageProvider>
  </StartupBoundary>
);
