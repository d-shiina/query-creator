import { app, BrowserWindow } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import { setupKintoneAPI } from "./main/kintone-api";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";

const inDevelopment = process.env.NODE_ENV === "development";

// Vite環境変数の型宣言
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// 開発環境でのコンソール警告を抑制
if (inDevelopment) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,
      webSecurity: !inDevelopment, // 開発環境では無効化
      allowRunningInsecureContent: inDevelopment,
      preload: preload,
    },
  });
  registerListeners(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app.whenReady().then(createWindow);

// Kintone API handlers
setupKintoneAPI();

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
