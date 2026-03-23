import { ipcMain, app } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ライセンス期限の設定（一元管理）
 */
export const LICENSE_EXPIRY_DATE = new Date(2026, 11, 31); // 2026年12月31日

/**
 * フォールバック用のアプリケーション情報
 */

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
        licenseExpiry: LICENSE_EXPIRY_DATE.toISOString(),
      };
    } catch (error) {
      console.error('Failed to read package.json:', error);
      return null;
    }
  });

  // ライセンス期限チェック用ハンドラー
  ipcMain.handle('app:check-trial-expiry', () => {
    try {
      const currentDate = new Date();
      const expiryDate = LICENSE_EXPIRY_DATE;
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
