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
        const api = (window as any).electronAppAPI;
        if (api && typeof api.getAppInfo === 'function') {
          const info = await api.getAppInfo();
          console.log('App info received:', info);
          setAppInfo(info);
        } else {
          console.log('electronAppAPI not available, cannot get app info');
          // フォールバック情報は不要なので何もしない
        }
      } catch (error) {
        console.error('Error fetching app info:', error);
        // フォールバック情報は不要なので何もしない
      } finally {
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  useEffect(() => {
    if (appInfo && appInfo.licenseExpiry) {
      const licenseExpiryDate = new Date(appInfo.licenseExpiry);
      const licenseStatus = getLicenseStatus(licenseExpiryDate);
      if (licenseStatus.status === 'expired') {
        setIsLicenseExpired(true);
      }
    }
  }, [appInfo]);

  const handleAppExit = () => {
    if ((window.electronAppAPI as any)?.quit) {
      (window.electronAppAPI as any).quit();
    } else {
      window.close();
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (loading || !appInfo) {
    return (
      <footer className="bg-card border-border fixed right-0 bottom-0 left-0 z-50 border-t">
        <div className="text-muted-foreground flex items-center justify-center px-4 py-1.5 text-xs">
          読み込み中...
        </div>
      </footer>
    );
  }

  console.log('SimpleFooter rendering with app info:', appInfo);

  const licenseExpiryDate = appInfo.licenseExpiry ? new Date(appInfo.licenseExpiry) : null;
  const licenseStatus = licenseExpiryDate ? getLicenseStatus(licenseExpiryDate) : null;

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

      <footer className="bg-card border-border fixed right-0 bottom-0 left-0 z-50 border-t">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-1.5 text-xs text-muted-foreground gap-2 sm:gap-4">
        {/* 左側：アプリ情報 */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="font-medium text-foreground">{appInfo.productName}</span>
          <span className="text-muted-foreground">Ver. {appInfo.version}</span>
        </div>
        
        {/* 右側：ライセンス期限と作者情報 */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {licenseExpiryDate && licenseStatus ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <span>ライセンス期限:</span>
                <span className={`font-medium ${licenseStatus.className}`}>
                  {formatDate(licenseExpiryDate)}
                  {licenseStatus.status === 'expiring' && ' (まもなく期限切れ)'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <span>ライセンス期限:</span>
                <span className="font-medium text-muted-foreground">取得中...</span>
              </div>
            )}
            <span className="text-muted-foreground/70 hidden md:inline">
              Made by {appInfo.author}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}