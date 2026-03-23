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
    
    // フォールバック情報を取得
    getFallbackInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:get-fallback-info'),
    
    // 体験版期限をチェック
    checkTrialExpiry: (): Promise<boolean> => ipcRenderer.invoke('app:check-trial-expiry'),
    
    // ライセンス期限を更新（管理者機能）
    updateLicenseExpiry: (newExpiry: string): Promise<{ success: boolean; error?: string }> => 
      ipcRenderer.invoke('app:update-license-expiry', newExpiry),
    
    // アプリケーションを終了
    quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
    
    // OS既定のブラウザで外部URLを開く
    openExternalURL: (url: string): Promise<{ success: boolean; error?: string }> => 
      ipcRenderer.invoke('open-external-url', url),
  });
}
