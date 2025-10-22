/**
 * アプリケーション情報を取得するヘルパー関数
 */

export interface AppInfo {
  version: string;
  author: string;
  productName: string;
  licenseExpiry: Date;
}

// package.jsonから情報を取得する場合（将来的にElectronのIPCを使用）
export const getAppInfo = (): AppInfo => {
  return {
    version: "1.0.0", // 将来的にはpackage.jsonから取得
    author: "Marubeni I-Digio",
    productName: "kintone Query Creator",
    licenseExpiry: new Date(2025, 11, 31), // 2025年12月31日
  };
};

/**
 * ライセンス期限のステータスを判定
 */
export const getLicenseStatus = (expiryDate: Date) => {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (now > expiryDate) {
    return {
      status: 'expired' as const,
      message: '期限切れ',
      className: 'text-destructive'
    };
  } else if (daysUntilExpiry <= 10) {
    return {
      status: 'expiring' as const,
      message: 'まもなく期限',
      className: 'text-yellow-600 dark:text-yellow-400'
    };
  } else {
    return {
      status: 'valid' as const,
      message: '有効',
      className: 'text-green-600 dark:text-green-400'
    };
  }
};

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDateJP = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};
