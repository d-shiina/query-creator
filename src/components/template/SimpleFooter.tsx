import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppInfo {
  version: string;
  license: string;
  author: string;
  productName: string;
  description: string;
  homepage: string;
  licenseExpiry: string;
}

// ライセンス期限のステータスを判定
const getLicenseStatus = (expiryDate: Date) => {
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

export default function SimpleFooter() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLicenseExpired, setIsLicenseExpired] = useState(false);

  useEffect(() => {
    console.log('SimpleFooter component mounted');
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
            author: "Marubeni I-DIGIO",
            productName: "kintone API Query Creator",
            description: "kintone Custom Query Generator Tool",
            homepage: "",
            licenseExpiry: new Date(2025, 10, 1).toISOString(), // 2025年11月1日
          });
        }
      } catch (error) {
        console.error('Error fetching app info:', error);
        // エラー時のフォールバック
        setAppInfo({
          version: "1.0.0",
          license: "MIT",
          author: "Marubeni I-DIGIO",
          productName: "kintone API Query Creator",
          description: "kintone Custom Query Generator Tool",
          homepage: "",
          licenseExpiry: new Date(2025, 10, 1).toISOString(), // 2025年11月1日
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  useEffect(() => {
    if (appInfo) {
      const licenseExpiryDate = new Date(appInfo.licenseExpiry);
      const licenseStatus = getLicenseStatus(licenseExpiryDate);
      if (licenseStatus.status === 'expired') {
        setIsLicenseExpired(true);
      }
    }
  }, [appInfo]);

  const handleAppExit = () => {
    if (window.electronAppAPI?.quit) {
      window.electronAppAPI.quit();
    } else {
      window.close();
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (loading || !appInfo) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50">
        <div className="flex items-center justify-center px-4 py-2 text-xs text-muted-foreground">
          Loading...
        </div>
      </footer>
    );
  }

  console.log('SimpleFooter rendering with app info:', appInfo);

  const licenseExpiryDate = new Date(appInfo.licenseExpiry);
  const licenseStatus = getLicenseStatus(licenseExpiryDate);

  return (
    <>
      {/* ライセンス期限切れモーダル */}
      <Dialog open={isLicenseExpired} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md [&>button]:hidden" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-destructive">トライアル期間終了</DialogTitle>
            <DialogDescription>
              トライアル期間が終了しました。
              <br />
              製品版リリースをお待ちください。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center space-x-2 pt-4">
            <Button 
              onClick={handleAppExit} 
              variant="destructive"
              className="w-full"
            >
              アプリケーションを終了
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 text-xs text-muted-foreground gap-2 sm:gap-4">
        {/* 左側：アプリ情報 */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="font-semibold text-foreground">{appInfo.productName}</span>
          <span className="text-blue-600 dark:text-blue-400">v{appInfo.version}</span>
        </div>
        
        {/* 右側：ライセンス期限と作者情報 */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2">
              <span>ライセンス期限:</span>
              <span className={`font-medium ${licenseStatus.className}`}>
                {formatDate(licenseExpiryDate)}
                {licenseStatus.status === 'expiring' && ' (まもなく期限切れ)'}
              </span>
            </div>
            <span className="text-muted-foreground/70 hidden md:inline">
              Made by {appInfo.author}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}