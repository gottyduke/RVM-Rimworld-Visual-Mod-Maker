const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: "RimWorld Visual Mod Maker",
    backgroundColor: "#f7f2ea",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("dialog:saveZip", async (_event, payload) => {
  const defaultName = payload?.defaultName || "RimWorldMod.zip";
  const bytes = payload?.bytes;

  if (!bytes) {
    return { ok: false, error: "Missing zip bytes." };
  }

  const result = await dialog.showSaveDialog({
    title: "导出 RimWorld Mod Zip",
    defaultPath: defaultName,
    filters: [{ name: "Zip archive", extensions: ["zip"] }]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  await fs.writeFile(result.filePath, Buffer.from(bytes));
  return { ok: true, filePath: result.filePath };
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
