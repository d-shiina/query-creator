import { BrowserWindow, ipcMain } from "electron";
import {
  WIN_CLOSE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_MINIMIZE_CHANNEL,
  WIN_IS_MAXIMIZED_CHANNEL,
  WIN_MAXIMIZE_CHANGED_CHANNEL,
  WIN_DEVTOOLS_TOGGLE_CHANNEL,
  WIN_DEVTOOLS_OPEN_CHANNEL,
  WIN_DEVTOOLS_CLOSE_CHANNEL,
} from "./window-channels";

/**
 * ウィンドウは再生成されうる（macOSのactivate等）ため、
 * 二重登録で例外にならないよう既存ハンドラを外してから登録する。
 */
function handle(channel: string, listener: () => unknown) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

export function addWindowEventListeners(mainWindow: BrowserWindow) {
  handle(WIN_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize();
  });
  handle(WIN_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  handle(WIN_CLOSE_CHANNEL, () => {
    mainWindow.close();
  });

  // 独自タイトルバーの最大化/元に戻すアイコンを切り替えるための状態通知
  handle(WIN_IS_MAXIMIZED_CHANNEL, () => mainWindow.isMaximized());

  const notifyMaximizeChanged = () => {
    if (mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(
      WIN_MAXIMIZE_CHANGED_CHANNEL,
      mainWindow.isMaximized(),
    );
  };
  mainWindow.on("maximize", notifyMaximizeChanged);
  mainWindow.on("unmaximize", notifyMaximizeChanged);

  // DevTools関連の機能を追加
  handle(WIN_DEVTOOLS_TOGGLE_CHANNEL, () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  });

  handle(WIN_DEVTOOLS_OPEN_CHANNEL, () => {
    mainWindow.webContents.openDevTools();
  });

  handle(WIN_DEVTOOLS_CLOSE_CHANNEL, () => {
    mainWindow.webContents.closeDevTools();
  });
}
