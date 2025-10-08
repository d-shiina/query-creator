import React from "react";
import { Loader2 } from "lucide-react";

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ 
  message = "読み込み中...",
  className = ""
}: PageLoadingProps) {
  return (
    <div className={`fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 ${className}`}>
      <div className="text-center">
        {/* シンプルなスピナー */}
        <div className="mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
        
        {/* メッセージ */}
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
