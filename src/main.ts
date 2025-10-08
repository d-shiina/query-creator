import { app, BrowserWindow, nativeImage, dialog } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import { setupKintoneAPI } from "./main/kintone-api";
import { registerAppInfoHandlers } from "./main/app-info";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import fs from "fs";

const inDevelopment = process.env.NODE_ENV === "development";

// Vite環境変数の型宣言
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// 開発環境でのコンソール警告を抑制
if (inDevelopment) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

// 体験版の期限をチェックする関数
function checkTrialExpiry(): boolean {
  const currentDate = new Date();
  const expiryDate = new Date(2025, 10, 1); // 2025年11月1日 (月は0から始まるので10は11月)

  return currentDate >= expiryDate;
}

// 体験版終了メッセージを表示してアプリを終了
async function showTrialExpiredAndExit(): Promise<void> {
  await dialog.showMessageBox({
    type: "warning",
    title: "体験版終了",
    message: "kintone Query Creator - 体験版終了",
    detail:
      "体験版の利用期間が終了しました。\n正式版をご利用いただくには、ライセンスをご購入ください。\n\nご利用いただき、ありがとうございました。",
    buttons: ["OK"],
    defaultId: 0,
    icon: fs.existsSync(
      path.join(process.cwd(), "assets", "icons", "win", "icon.ico"),
    )
      ? nativeImage.createFromPath(
          path.join(process.cwd(), "assets", "icons", "win", "icon.ico"),
        )
      : undefined,
  });

  console.log("Trial expired, closing application...");
  app.quit();
}

function createWindow() {
  const preload = path.join(__dirname, "preload.js");

  // アイコンパスを設定
  // 開発環境ではプロジェクトルートから、本番環境では相対パスから
  let iconPath: string;

  if (inDevelopment) {
    // 開発環境: プロジェクトルートから
    iconPath = path.join(process.cwd(), "assets", "icons", "win", "icon.ico");
  } else {
    // 本番環境: ビルドディレクトリから
    iconPath = path.join(__dirname, "..", "assets", "icons", "win", "icon.ico");
  }

  console.log("Icon path:", iconPath);
  console.log("Icon exists:", fs.existsSync(iconPath));

  // nativeImageを使用してアイコンを作成
  let appIcon;
  if (fs.existsSync(iconPath)) {
    appIcon = nativeImage.createFromPath(iconPath);
    console.log("Icon loaded successfully");
  } else {
    console.log("Icon file not found, using default");
    appIcon = undefined;
  }

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 780,
    autoHideMenuBar: true,
    icon: appIcon,
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

app.whenReady().then(async () => {
  // 体験版の期限をチェック
  if (checkTrialExpiry()) {
    await showTrialExpiredAndExit();
    return;
  }

  // Windows用のApp User Model IDを設定（タスクバーのアイコンを正しく表示するため）
  if (process.platform === "win32") {
    app.setAppUserModelId("com.kintone.query-creator");
  }

  createWindow();
});

// Kintone API handlers
setupKintoneAPI();

// App info handlers
registerAppInfoHandlers();

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
