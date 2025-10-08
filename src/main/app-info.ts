import { ipcMain } from 'electron';
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
        licenseExpiry: new Date(2026, 9, 4).toISOString(),
      };
    } catch (error) {
      console.error('Failed to read package.json:', error);
      return {
        version: '1.0.0',
        license: 'MIT',
        author: 'MSYS',
        productName: 'kintone Query Creator',
        description: 'kintone Custom Query Generator Tool',
        homepage: '',
        licenseExpiry: new Date(2026, 9, 4).toISOString(),
      };
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
      return { success: false, error: error.message };
    }
  });
}
