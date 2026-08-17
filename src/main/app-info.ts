import { ipcMain, app } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  checkLicense,
  getLicensePath,
  parseExpiryDate,
  PRODUCT_TAG,
  DEFAULT_LICENSE_DIR,
  type LicenseStatus,
} from './license';

/**
 * ライセンスファイルが無い場合に使用する組み込みの期限。
 * 正規のライセンスファイルが配置されていればそちらが優先される。
 */
export const FALLBACK_LICENSE_EXPIRY_DATE = new Date(2026, 7, 31, 23, 59, 59); // 2026年8月31日 23:59:59

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
      console.log(
        'License file not available, falling back to built-in expiry:',
        cachedStatus.message,
      );
    }
  }
  return cachedStatus;
}

/**
 * 有効期限を返す。
 * ライセンスファイルから取得できればその期限、無ければ組み込みの期限。
 */
export function getLicenseExpiryDate(): Date {
  const status = getLicenseStatus();

  if (status.found && status.expiryDate) {
    try {
      return parseExpiryDate(status.expiryDate);
    } catch (error) {
      console.error('Failed to parse license expiry_date:', error);
    }
  }

  return FALLBACK_LICENSE_EXPIRY_DATE;
}

/**
 * 期限切れ（＝アプリを使用できない状態）かどうかを判定する。
 *
 * ライセンスファイルがある場合は署名検証・ハードウェア照合・猶予期間を含む
 * 検証結果に従う。無い場合は組み込み期限との比較にフォールバックする。
 */
export function isLicenseExpired(): boolean {
  const status = getLicenseStatus();

  if (status.found) {
    return !status.valid;
  }

  return new Date() >= FALLBACK_LICENSE_EXPIRY_DATE;
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
        licenseExpiry: getLicenseExpiryDate().toISOString(),
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
      const status = getLicenseStatus();
      return {
        ...status,
        // ライセンスファイルを配置すべき場所（未配置時の案内に使う）
        licensePath: getLicensePath(PRODUCT_TAG, DEFAULT_LICENSE_DIR),
      };
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
