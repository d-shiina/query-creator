import {
  WIN_MINIMIZE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_CLOSE_CHANNEL,
  WIN_DEVTOOLS_TOGGLE_CHANNEL,
  WIN_DEVTOOLS_OPEN_CHANNEL,
  WIN_DEVTOOLS_CLOSE_CHANNEL,
} from "./window-channels";

export function exposeWindowContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL),
    toggleDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_TOGGLE_CHANNEL),
    openDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_OPEN_CHANNEL),
    closeDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_CLOSE_CHANNEL),
  });
}
