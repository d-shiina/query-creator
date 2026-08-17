import React, { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";

// 明背景プレート／暗背景プレートの2種類を用意し、テーマに合わせて出し分ける
const lightIconPath = new URL("../../assets/logo_light.ico", import.meta.url)
  .href;
const darkIconPath = new URL("../../assets/logo_dark.ico", import.meta.url).href;

/**
 * ダークテーマかどうかを返す。
 * テーマは documentElement の `dark` クラスで表現されているため、
 * クラスの変化を監視してテーマ切り替えに追従する。
 */
function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));

    // マウント時点の状態と初期同期がずれるケースに備えて一度合わせる
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = "",
  size = 48,
}) => {
  const [imageError, setImageError] = useState(false);
  const isDark = useIsDarkTheme();

  // アイコンファイルの読み込みに失敗した場合はSVGアイコンを表示
  if (imageError) {
    return <AppIcon size={size} className={`text-white ${className}`} />;
  }

  return (
    <img
      src={isDark ? darkIconPath : lightIconPath}
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
