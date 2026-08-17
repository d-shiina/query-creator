import React, { useState } from "react";
import { AppIcon } from "./app-icon";

// 角丸プレートの外側が透過されているため、明暗どちらのテーマでもそのまま使える
const logoPath = new URL("../../assets/logo.ico", import.meta.url).href;

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = "",
  size = 48,
}) => {
  const [imageError, setImageError] = useState(false);

  // アイコンファイルの読み込みに失敗した場合はSVGアイコンを表示
  if (imageError) {
    return <AppIcon size={size} className={`text-white ${className}`} />;
  }

  return (
    <img
      src={logoPath}
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
