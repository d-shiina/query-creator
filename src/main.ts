import { app, BrowserWindow, nativeImage, dialog, shell, ipcMain } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import { setupKintoneAPI } from "./main/kintone-api";
import {
  registerAppInfoHandlers,
  getLicenseStatus,
  isLicenseExpired,
} from "./main/app-info";
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

// ライセンスを検証する関数
// ライセンスは必須のため、未配置・不正・期限切れのいずれでも使用不可とする
async function checkTrialExpiry(): Promise<boolean> {
  try {
    return isLicenseExpired();
  } catch (error) {
    console.error("Failed to verify license:", error);
    // 判定できない場合は安全側に倒して使用不可とする
    return true;
  }
}

// 猶予期間中（NLライセンスの期限切れ後90日以内）は警告を出して続行する
async function warnIfLicenseInGracePeriod(): Promise<void> {
  const status = getLicenseStatus();
  if (!status.inGracePeriod || !status.message) return;

  await dialog.showMessageBox({
    type: "warning",
    title: "ライセンス有効期限切れ",
    message: "ライセンスの有効期限が切れています",
    detail: status.message,
    buttons: ["続行"],
  });
}

// 起動できない理由を表示してアプリを終了
async function showTrialExpiredAndExit(): Promise<void> {
  const status = getLicenseStatus();

  // 有効なライセンスを読めた上で無効（期限切れ・PC不一致等）なら、その理由を示す。
  // 読めなかった場合（未配置・破損・署名不正）は未登録として扱い、
  // 詳細な理由はログにのみ残す。
  const title = status.found
    ? "ライセンスが有効ではありません"
    : "ライセンスが登録されていません";
  const detail = status.found
    ? (status.message ?? "ライセンスを検証できませんでした。")
    : "ライセンス登録が行われていません。";

  await dialog.showMessageBox({
    type: "warning",
    title,
    message: `kintone API Query Creator - ${title}`,
    detail,
    buttons: ["閉じる"],
    defaultId: 0,
    cancelId: 0,
    icon: fs.existsSync(
      path.join(process.cwd(), "assets", "icons", "win", "icon.ico"),
    )
      ? nativeImage.createFromPath(
          path.join(process.cwd(), "assets", "icons", "win", "icon.ico"),
        )
      : undefined,
  });

  console.log("License is not valid, closing application...");
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

  // 外部リンクを既定のブラウザで開くように設定
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Window open handler triggered for URL:', url);
    // 外部URLの場合は既定のブラウザで開く
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('Opening external URL in default browser:', url);
      shell.openExternal(url);
      return { action: 'deny' }; // Electronでは開かない
    }
    return { action: 'allow' }; // 内部リンクは許可
  });

  // ナビゲーション前にチェック（外部サイトへの移動を防ぐ）
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Will navigate to:', navigationUrl);
    // アプリの内部URL以外への移動を防ぐ
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      // 開発サーバーまたはローカルファイルでない場合は外部ブラウザで開く
      if (!navigationUrl.includes('localhost') && !navigationUrl.includes('127.0.0.1') && !navigationUrl.startsWith('file://')) {
        console.log('Preventing navigation and opening in external browser:', navigationUrl);
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app.whenReady().then(async () => {
  // ライセンスの期限をチェック
  if (await checkTrialExpiry()) {
    await showTrialExpiredAndExit();
    return;
  }

  // 猶予期間中なら警告を出す（続行は可能）
  await warnIfLicenseInGracePeriod();

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

// External URL handler - OS既定のブラウザでURLを開く
ipcMain.handle('open-external-url', async (event, url: string) => {
  try {
    console.log('IPC: Opening external URL:', url);
    await shell.openExternal(url);
    console.log('IPC: Successfully opened external URL');
    return { success: true };
  } catch (error) {
    console.error('IPC: Failed to open external URL:', error);
    return { success: false, error: String(error) };
  }
});

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
