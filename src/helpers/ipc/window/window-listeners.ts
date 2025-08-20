import { BrowserWindow, ipcMain } from "electron";
import {
  WIN_CLOSE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_MINIMIZE_CHANNEL,
  WIN_DEVTOOLS_TOGGLE_CHANNEL,
  WIN_DEVTOOLS_OPEN_CHANNEL,
  WIN_DEVTOOLS_CLOSE_CHANNEL,
} from "./window-channels";

export function addWindowEventListeners(mainWindow: BrowserWindow) {
  ipcMain.handle(WIN_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize();
  });
  ipcMain.handle(WIN_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle(WIN_CLOSE_CHANNEL, () => {
    mainWindow.close();
  });
  
  // DevTools関連の機能を追加
  ipcMain.handle(WIN_DEVTOOLS_TOGGLE_CHANNEL, () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  });
  
  ipcMain.handle(WIN_DEVTOOLS_OPEN_CHANNEL, () => {
    mainWindow.webContents.openDevTools();
  });
  
  ipcMain.handle(WIN_DEVTOOLS_CLOSE_CHANNEL, () => {
    mainWindow.webContents.closeDevTools();
  });
}
