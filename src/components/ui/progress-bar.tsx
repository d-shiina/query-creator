import React, { useState, useEffect } from "react";

interface TopProgressBarProps {
  isLoading: boolean;
  duration?: number;
  className?: string;
}

export function TopProgressBar({ 
  isLoading, 
  duration = 1000,
  className = "" 
}: TopProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    let animationFrame: number;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min(elapsed / duration * 100, 95); // 最大95%まで

      setProgress(percentage);

      if (percentage < 95) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isLoading, duration]);

  useEffect(() => {
    if (!isLoading && progress > 0) {
      // ローディング完了時は100%まで一気に進めてからフェードアウト
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress]);

  if (progress === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-1 bg-transparent ${className}`}>
      <div 
        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-200 ease-out shadow-sm"
        style={{ 
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1
        }}
      />
    </div>
  );
}
