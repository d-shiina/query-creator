import { contextBridge, ipcRenderer } from 'electron';

export interface AppInfo {
  version: string;
  license: string;
  author: string;
  productName: string;
  description: string;
  homepage: string;
  licenseExpiry: string;
}

/**
 * アプリケーション情報のコンテキストをレンダラープロセスに公開
 */
export function exposeAppContext() {
  contextBridge.exposeInMainWorld('electronAppAPI', {
    // アプリケーション情報を取得
    getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:get-info'),
    
    // ライセンス期限を更新（管理者機能）
    updateLicenseExpiry: (newExpiry: string): Promise<{ success: boolean; error?: string }> => 
      ipcRenderer.invoke('app:update-license-expiry', newExpiry),
    
    // アプリケーションを終了
    quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  });
}
