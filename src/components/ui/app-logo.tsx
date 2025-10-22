import React, { useState } from "react";
import { AppIcon } from "./app-icon";
const iconPath = new URL("../../assets/icon.ico", import.meta.url).href;

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = "",
  size = 48,
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Electronアプリでの静的ファイル参照方法
  const getIconPath = () => {
    // Viteでimportしたアイコンパスを使用
    return iconPath;
  };

  // アイコンファイルの読み込みに失敗した場合はSVGアイコンを表示
  if (imageError) {
    return (
      <AppIcon
        size={size}
        className={`text-white ${className}`}
      />
    );
  }

  return (
    <img
      src={getIconPath()}
      alt="App Icon"
      className={className}
      style={{ width: size, height: size }}
      onError={() => {
        console.log("Icon file load failed, fallback to SVG icon");
        setImageError(true);
      }}
    />
  );
};