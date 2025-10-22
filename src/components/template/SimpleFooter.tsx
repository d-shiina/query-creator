import React, { useEffect, useState } from "react";
import { getAppInfo, getLicenseStatus } from "@/helpers/app_info";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SimpleFooter() {
  const appInfo = getAppInfo();
  const [isLicenseExpired, setIsLicenseExpired] = useState(false);
  const licenseStatus = getLicenseStatus(appInfo.licenseExpiry);

  useEffect(() => {
    if (licenseStatus.status === 'expired') {
      setIsLicenseExpired(true);
    }
  }, [licenseStatus.status]);

  const handleAppExit = () => {
    if ((window as any).electronAppAPI?.quit) {
      (window as any).electronAppAPI.quit();
    } else {
      window.close();
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

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
                {formatDate(appInfo.licenseExpiry)}
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