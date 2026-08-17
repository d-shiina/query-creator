import { ipcMain, app } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkLicense, parseExpiryDate, type LicenseStatus } from './license';

/**
 * ライセンス状態のキャッシュ。
 * 起動時に一度解決し、以降のIPC呼び出しで使い回す。
 */
let cachedStatus: LicenseStatus | null = null;

/**
 * ライセンス状態を取得する（初回のみファイルを読む）。
 * @param forceReload trueならキャッシュを無視して読み直す
 */
export function getLicenseStatus(forceReload = false): LicenseStatus {
  if (cachedStatus === null || forceReload) {
    cachedStatus = checkLicense();
    if (cachedStatus.found) {
      console.log('License loaded:', {
        productName: cachedStatus.productName,
        licenseType: cachedStatus.licenseType,
        expiryDate: cachedStatus.expiryDate,
        valid: cachedStatus.valid,
        inGracePeriod: cachedStatus.inGracePeriod,
      });
    } else {
      console.error('License unavailable:', cachedStatus.message);
    }
  }
  return cachedStatus;
}

/**
 * 有効期限を返す。
 * ライセンスが無い／無期限ライセンスの場合はnull。
 */
export function getLicenseExpiryDate(): Date | null {
  const status = getLicenseStatus();

  if (status.found && status.expiryDate) {
    try {
      return parseExpiryDate(status.expiryDate);
    } catch (error) {
      console.error('Failed to parse license expiry_date:', error);
    }
  }

  return null;
}

/**
 * アプリを使用できない状態かどうかを判定する。
 *
 * ライセンスは必須のため、ファイルが無い・署名が不正・ハードウェアが
 * 一致しない・期限切れ（NLは猶予期間経過後）のいずれかで使用不可となる。
 */
export function isLicenseExpired(): boolean {
  return !getLicenseStatus().valid;
}

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
        licenseExpiry: getLicenseExpiryDate()?.toISOString() ?? null,
      };
    } catch (error) {
      console.error('Failed to read package.json:', error);
      return null;
    }
  });

  // ライセンス期限チェック用ハンドラー
  ipcMain.handle('app:check-trial-expiry', () => {
    try {
      return isLicenseExpired();
    } catch (error) {
      console.error('Failed to check trial expiry:', error);
      return false;
    }
  });

  // ライセンスの詳細情報を返すハンドラー
  ipcMain.handle('app:get-license-status', () => {
    try {
      return getLicenseStatus();
    } catch (error) {
      console.error('Failed to get license status:', error);
      return null;
    }
  });

  // ライセンスファイルを読み直すハンドラー（差し替え後の再読込用）
  ipcMain.handle('app:reload-license', () => {
    try {
      const status = getLicenseStatus(true);
      return { success: true, status };
    } catch (error) {
      console.error('Failed to reload license:', error);
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
