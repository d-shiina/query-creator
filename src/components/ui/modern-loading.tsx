import React from "react";
import { Loader2 } from "lucide-react";

interface ModernLoadingSpinnerProps {
  message: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "minimal" | "fullscreen";
}

export function ModernLoadingSpinner({ 
  message, 
  size = "md", 
  variant = "default" 
}: ModernLoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  const containerClasses = {
    default: "flex flex-col items-center justify-center py-12",
    minimal: "flex items-center justify-center gap-3 py-6",
    fullscreen: "fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50"
  };

  if (variant === "minimal") {
    return (
      <div className={containerClasses[variant]}>
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        <span className="text-muted-foreground text-sm font-medium">{message}</span>
      </div>
    );
  }

  return (
    <div className={containerClasses[variant]}>
      <div className="relative mb-4">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      </div>
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}

interface LoadingOverlayProps {
  message: string;
  progress?: number;
  details?: string;
}

export function LoadingOverlay({ message, progress, details }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="text-center max-w-md">
        {/* シンプルなスピナー */}
        <div className="mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
        
        {/* メッセージ */}
        <h2 className="text-foreground text-lg font-semibold mb-2">{message}</h2>
        
        {/* 詳細情報 */}
        {details && (
          <p className="text-muted-foreground text-sm mb-4">{details}</p>
        )}
        
        {/* プログレスバー */}
        {progress !== undefined && (
          <div className="w-64 bg-secondary/30 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
