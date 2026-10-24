const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const scheme = "trackdraw-poc";
const origin = `${scheme}://desktop`;
const dist =
  process.env.TRACKDRAW_POC_SMOKE && process.env.TRACKDRAW_POC_SMOKE_BUNDLE
    ? path.resolve(process.env.TRACKDRAW_POC_SMOKE_BUNDLE)
    : path.join(__dirname, "dist");
const maxBytes = 16 * 1024 * 1024;
let window;
let repository;
let approvedClose = false;
let wantsQuit = false;
const { openRepository } = require("./repository.cjs");
const { openOfflineAssets } = require("./offline-assets.cjs");
let offlineAssets;

// The removable POC never shares storage with the browser or another Electron app.
app.setName("TrackDraw Desktop Alpha");
app.setPath(
  "userData",
  process.env.TRACKDRAW_POC_SMOKE
    ? path.join(__dirname, ".smoke-profile")
    : path.join(app.getPath("appData"), "TrackDraw Desktop Alpha")
);
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
app.on("second-instance", () => {
  window?.show();
  window?.focus();
});
app.on("before-quit", () => {
  wantsQuit = true;
});
app.on("will-quit", () => repository?.close());
protocol.registerSchemesAsPrivileged([
  {
    scheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function trustedFrame(event) {
  const url = new URL(event.senderFrame.url);
  if (
    event.sender !== window?.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    url.protocol !== `${scheme}:` ||
    url.hostname !== "desktop"
  ) {
    throw new Error("Untrusted desktop request");
  }
}

function validatePayload(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > maxBytes)
    throw new Error("Project exceeds the POC's 16 MiB limit.");
  const value = JSON.parse(text);
  if (
    !value ||
    ![1, 2].includes(value.version) ||
    !Array.isArray(value.shapes) ||
    !value.field
  )
    throw new Error("Choose a TrackDraw project JSON file.");
  return text;
}

function action(name) {
  window?.webContents.send("poc:menu", name);
}

app.whenReady().then(async () => {
  if (!singleInstance) return;
  try {
    await fs.mkdir(app.getPath("userData"), { recursive: true });
    offlineAssets = openOfflineAssets(
      dist,
      path.join(app.getPath("userData"), "offline-assets")
    );
    repository = openRepository(
      path.join(app.getPath("userData"), "projects.sqlite"),
      offlineAssets
    );
  } catch (error) {
    dialog.showErrorBox(
      "Desktop project storage could not open",
      error.message
    );
    app.quit();
    return;
  }
  ipcMain.handle("desktop:projects", (event, name, payload) => {
    trustedFrame(event);
    return repository.command(name, payload);
  });
  ipcMain.handle("desktop:close-ready", (event) => {
    trustedFrame(event);
    approvedClose = true;
    window.close();
    if (wantsQuit) app.quit();
  });
  protocol.handle(scheme, async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "desktop")
      return new Response("Not found", { status: 404 });
    if (url.pathname.startsWith("/api/"))
      return Response.json(
        { ok: false, error: "Cloud functions are outside this offline POC." },
        { status: 503 }
      );
    if (request.method !== "GET")
      return new Response("Not found", { status: 404 });
    const pathname =
      url.pathname === "/studio" || url.pathname === "/"
        ? "/index.html"
        : decodeURIComponent(url.pathname);
    const filename = path.resolve(dist, `.${pathname}`);
    if (!filename.startsWith(`${dist}${path.sep}`))
      return new Response("Forbidden", { status: 403 });
    try {
      const response = await net.fetch(
        pathToFileURL(offlineAssets.fileFor(pathname) || filename).href
      );
      const headers = new Headers(response.headers);
      headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; media-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'"
      );
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
    (_details, callback) => callback({ cancel: true })
  );
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false)
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on("will-download", (_event, item) => {
    item.setSaveDialogOptions({ title: "Export from TrackDraw Desktop Alpha" });
  });

  ipcMain.handle("poc:open", async (event) => {
    trustedFrame(event);
    const result = await dialog.showOpenDialog(window, {
      title: "Open a TrackDraw project copy",
      properties: ["openFile"],
      filters: [{ name: "TrackDraw project", extensions: ["json"] }],
    });
    if (result.canceled) return null;
    const filename = result.filePaths[0];
    if ((await fs.stat(filename)).size > maxBytes)
      throw new Error("Project exceeds the POC's 16 MiB limit.");
    return {
      name: path.basename(filename),
      text: validatePayload(await fs.readFile(filename, "utf8")),
    };
  });

  ipcMain.handle("poc:save", async (event, { text, name }) => {
    trustedFrame(event);
    validatePayload(text);
    const safeName =
      typeof name === "string"
        ? name.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 100)
        : "track";
    const result = await dialog.showSaveDialog(window, {
      title: "Save a TrackDraw project copy",
      defaultPath: `${safeName || "track"}.json`,
      filters: [{ name: "TrackDraw project", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, text, "utf8");
    return path.basename(result.filePath);
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      {
        label: "File",
        submenu: [
          {
            label: "New track",
            accelerator: "CmdOrCtrl+N",
            click: () => action("new"),
          },
          {
            label: "Project library",
            accelerator: "CmdOrCtrl+Shift+H",
            click: () => action("home"),
          },
          {
            label: "Open project copy…",
            accelerator: "CmdOrCtrl+O",
            click: () => action("open"),
          },
          {
            label: "Save project copy as…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => action("save"),
          },
          { type: "separator" },
          {
            label: "Close document",
            accelerator: "CmdOrCtrl+W",
            click: () => action("close-tab"),
          },
          {
            role: "close",
            label: "Close window",
            accelerator: "CmdOrCtrl+Shift+W",
          },
        ],
      },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [{ role: "toggleDevTools" }, { role: "togglefullscreen" }],
      },
    ])
  );

  const createWindow = () => {
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 960,
      minHeight: 640,
      title: "TrackDraw Desktop Alpha",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    approvedClose = false;
    window.on("close", (event) => {
      if (approvedClose) return;
      event.preventDefault();
      window.webContents.send("desktop:flush-before-close");
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, target) => {
      const url = new URL(target);
      if (
        url.protocol !== `${scheme}:` ||
        url.hostname !== "desktop" ||
        url.pathname !== "/studio"
      )
        event.preventDefault();
    });
    window.loadURL(`${origin}/studio`);
  };
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
