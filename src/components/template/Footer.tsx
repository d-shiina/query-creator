import React, { useEffect, useState } from "react";
import { getLicenseStatus, formatDateJP } from "@/helpers/app_info";

interface AppInfo {
  version: string;
  license: string;
  author: string;
  productName: string;
  description: string;
  homepage: string;
  licenseExpiry: string;
}

export default function Footer() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Footer component mounted');
    const fetchAppInfo = async () => {
      try {
        console.log('Checking electronAppAPI:', !!window.electronAppAPI);
        if (window.electronAppAPI) {
          const info = await window.electronAppAPI.getAppInfo();
          console.log('App info received:', info);
          setAppInfo(info);
        } else {
          console.log('electronAppAPI not available, using fallback');
          // フォールバック情報
          setAppInfo({
            version: "1.0.0",
            license: "MIT",
            author: "MSYS",
            productName: "kintone Query Creator",
            description: "",
            homepage: "",
            licenseExpiry: new Date(2026, 9, 4).toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch app info:', error);
        // フォールバック情報
        setAppInfo({
          version: "1.0.0",
          license: "MIT",
          author: "MSYS",
          productName: "kintone Query Creator",
          description: "",
          homepage: "",
          licenseExpiry: new Date(2026, 9, 4).toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  if (loading || !appInfo) {
    console.log('Footer rendering loading state');
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-red-500/95 backdrop-blur supports-[backdrop-filter]:bg-red-500/60 border-t border-border z-50">
        <div className="flex items-center justify-center px-4 py-2 text-xs text-white">
          <span>Loading Footer...</span>
        </div>
      </footer>
    );
  }

  console.log('Footer rendering with app info:', appInfo);

  const licenseExpiryDate = new Date(appInfo.licenseExpiry);
  const licenseStatus = getLicenseStatus(licenseExpiryDate);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-blue-500/95 backdrop-blur supports-[backdrop-filter]:bg-blue-500/60 border-t border-border z-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 text-xs text-muted-foreground gap-2 sm:gap-4">
        {/* 左側：アプリ情報 */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="font-semibold text-foreground">{appInfo.productName}</span>
          <span className="text-blue-600 dark:text-blue-400">v{appInfo.version}</span>
          <span className="hidden sm:inline">License: {appInfo.license}</span>
        </div>
        
        {/* 右側：ライセンス期限と作者情報 */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <span>License期限:</span>
            <span className={`font-medium ${licenseStatus.className}`}>
              {formatDateJP(licenseExpiryDate)}
              {licenseStatus.status !== 'valid' && ` (${licenseStatus.message})`}
            </span>
          </div>
          <span className="text-muted-foreground/70 hidden md:inline">
            Made by {appInfo.author} 
          </span>
        </div>
      </div>
    </footer>
  );
}
