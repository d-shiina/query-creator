import React from "react";

export default function SimpleFooter() {
  const appInfo = {
    version: "1.0.0",
    license: "MIT",
    author: "MSYS",
    productName: "kintone Query Creator",
    licenseExpiry: "2026年10月4日",
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50">
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
            <span className="font-medium text-green-600 dark:text-green-400">
              {appInfo.licenseExpiry}
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
