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
const dist = path.join(__dirname, "dist");
const maxBytes = 16 * 1024 * 1024;
let window;

// The removable POC never shares storage with the browser or another Electron app.
app.setName("TrackDraw Desktop POC");
app.setPath(
  "userData",
  path.join(
    __dirname,
    process.env.TRACKDRAW_POC_SMOKE ? ".smoke-profile" : ".profile"
  )
);
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
      const response = await net.fetch(pathToFileURL(filename).href);
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
    item.setSaveDialogOptions({ title: "Export from TrackDraw Desktop POC" });
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
          { role: "close" },
        ],
      },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "toggleDevTools" },
          { role: "togglefullscreen" },
        ],
      },
    ])
  );

  const createWindow = () => {
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 960,
      minHeight: 640,
      title: "TrackDraw Desktop POC",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
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
