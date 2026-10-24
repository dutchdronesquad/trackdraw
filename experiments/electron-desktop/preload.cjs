const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trackdrawDesktop", {
  openProject: () => ipcRenderer.invoke("poc:open"),
  saveProject: (payload) => ipcRenderer.invoke("poc:save", payload),
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("poc:menu", listener);
    return () => ipcRenderer.removeListener("poc:menu", listener);
  },
});
