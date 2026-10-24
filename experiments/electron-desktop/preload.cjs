const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trackdrawDesktop", {
  platform: process.platform,
  projects: (name, payload) =>
    ipcRenderer.invoke("desktop:projects", name, payload),
  finishClose: () => ipcRenderer.invoke("desktop:close-ready"),
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("desktop:flush-before-close", listener);
    return () =>
      ipcRenderer.removeListener("desktop:flush-before-close", listener);
  },
  openProject: () => ipcRenderer.invoke("poc:open"),
  saveProject: (payload) => ipcRenderer.invoke("poc:save", payload),
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("poc:menu", listener);
    return () => ipcRenderer.removeListener("poc:menu", listener);
  },
});
