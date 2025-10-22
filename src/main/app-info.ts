import { ipcMain, app } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * アプリケーション情報を取得するIPCハンドラー
 */
export function registerAppInfoHandlers() {
  // package.jsonからアプリケーション情報を取得
  ipcMain.handle('app:get-info', () => {
    try {
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      return {
        version: packageJson.version,
        license: packageJson.license,
        author: packageJson.author,
        productName: packageJson.productName,
        description: packageJson.description,
        homepage: packageJson.homepage,
        // ライセンス期限は設定ファイルから取得（今回は仮の値）
        licenseExpiry: new Date(2025, 10, 1).toISOString(), // 2025年11月1日
      };
    } catch (error) {
      console.error('Failed to read package.json:', error);
      return {
        version: '1.0.0',
        author: 'Marubeni I-DIGIO',
        productName: 'kintone API Query Creator',
        description: 'kintone Custom Query Generator Tool',
        homepage: '',
        licenseExpiry: new Date(2025, 10, 1).toISOString(), // 2025年11月1日
      };
    }
  });

  // ライセンス期限チェック用ハンドラー
  ipcMain.handle('app:check-trial-expiry', () => {
    try {
      const currentDate = new Date();
      const expiryDate = new Date(2025, 10, 1); // 2025年11月1日
      return currentDate >= expiryDate;
    } catch (error) {
      console.error('Failed to check trial expiry:', error);
      return false;
    }
  });

  // ライセンス期限を更新するハンドラー（管理者用）
  ipcMain.handle('app:update-license-expiry', (_event, newExpiry: string) => {
    try {
      // 実際の実装では、設定ファイルに保存する
      console.log('License expiry updated to:', newExpiry);
      return { success: true };
    } catch (error) {
      console.error('Failed to update license expiry:', error);
      return { success: false, error: String(error) };
    }
  });

  // アプリケーション終了ハンドラー
  ipcMain.handle('app:quit', () => {
    try {
      app.quit();
    } catch (error) {
      console.error('Failed to quit application:', error);
    }
  });
}
