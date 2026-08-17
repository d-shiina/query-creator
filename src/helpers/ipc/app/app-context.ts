import { contextBridge, ipcRenderer } from 'electron';

export interface AppInfo {
  version: string;
  license: string;
  author: string;
  productName: string;
  description: string;
  homepage: string;
  licenseExpiry: string | null;
}

/** ライセンスファイルの検証状態 */
export interface LicenseStatusInfo {
  /** ライセンスファイルが存在し、署名検証に通ったか */
  found: boolean;
  /** 利用可能か（猶予期間中もtrue） */
  valid: boolean;
  expiryDate: string | null;
  licenseType: string | null;
  productName: string | null;
  isMigs: boolean;
  inGracePeriod: boolean;
  graceDaysRemaining: number | null;
  message: string | null;
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
    
    // ライセンスファイルの検証状態を取得
    getLicenseStatus: (): Promise<LicenseStatusInfo | null> =>
      ipcRenderer.invoke('app:get-license-status'),

    // ライセンスファイルを読み直す（差し替え後の再読込用）
    reloadLicense: (): Promise<{
      success: boolean;
      status?: LicenseStatusInfo;
      error?: string;
    }> => ipcRenderer.invoke('app:reload-license'),
    
    // アプリケーションを終了
    quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
    
    // OS既定のブラウザで外部URLを開く
    openExternalURL: (url: string): Promise<{ success: boolean; error?: string }> => 
      ipcRenderer.invoke('open-external-url', url),
  });
}
