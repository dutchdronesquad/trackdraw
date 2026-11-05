import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { installNativeDownloads } from "./downloads.mjs";

const menuListeners = new Set();
const closeListeners = new Set();
// WKWebView gives web key handlers the first chance at menu shortcuts. Reserve
// Save Copy before the shared editor's Cmd/Ctrl+S snapshot handler consumes it.
window.addEventListener(
  "keydown",
  (event) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) for (const callback of menuListeners) callback("save");
    }
  },
  true
);
await listen("desktop:menu", ({ payload }) => {
  for (const callback of menuListeners) callback(payload);
});
await listen("desktop:flush-before-close", () => {
  for (const callback of closeListeners) callback();
});
window.trackdrawDesktop = Object.freeze({
  projects: (name, payload = null) =>
    invoke("desktop_projects", { name, payload }),
  finishClose: () => invoke("finish_close"),
  openProject: () => invoke("open_project"),
  saveProject: (payload) => invoke("save_project", { payload }),
  onMenuAction: (callback) => {
    menuListeners.add(callback);
    return () => menuListeners.delete(callback);
  },
  onCloseRequested: (callback) => {
    closeListeners.add(callback);
    return () => closeListeners.delete(callback);
  },
});
installNativeDownloads(
  (payload) => invoke("save_export", { payload }),
  async (error) => {
    const { toast } = await import("sonner");
    toast.error(String(error?.message || error));
  }
);
// Storage modules call the bridge on import, so renderer startup follows setup.
await import("../main.jsx");
