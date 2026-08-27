import {
  WIN_MINIMIZE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_CLOSE_CHANNEL,
  WIN_IS_MAXIMIZED_CHANNEL,
  WIN_MAXIMIZE_CHANGED_CHANNEL,
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
    isMaximized: () => ipcRenderer.invoke(WIN_IS_MAXIMIZED_CHANNEL),
    /** 最大化状態の変化を購読する。戻り値を呼ぶと購読を解除できる */
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: unknown, isMaximized: boolean) =>
        callback(isMaximized);
      ipcRenderer.on(WIN_MAXIMIZE_CHANGED_CHANNEL, listener);
      return () =>
        ipcRenderer.removeListener(WIN_MAXIMIZE_CHANGED_CHANNEL, listener);
    },
    /** タイトルバーの見た目をOSごとに変えるために使う */
    platform: process.platform,
    toggleDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_TOGGLE_CHANNEL),
    openDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_OPEN_CHANNEL),
    closeDevTools: () => ipcRenderer.invoke(WIN_DEVTOOLS_CLOSE_CHANNEL),
  });
}
