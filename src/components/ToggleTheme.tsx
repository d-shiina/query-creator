import { Moon, Sun } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentTheme, setTheme } from "@/helpers/theme_helpers";
import { ThemeMode } from "@/types/theme-mode";

interface ToggleThemeProps {
  /** タイトルバーの中では枠のない ghost、単独で浮かせるときは outline を使う */
  variant?: "outline" | "ghost";
  className?: string;
}

export default function ToggleTheme({
  variant = "outline",
  className = "",
}: ToggleThemeProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = async () => {
      const { local } = await getCurrentTheme();
      const activeTheme = local || "system";
      setCurrentTheme(activeTheme);

      // 現在のダークモード状態を確認
      let isCurrentlyDark = document.documentElement.classList.contains("dark");

      // systemテーマの場合は、システムの実際の設定を取得
      if (activeTheme === "system") {
        const systemIsDark = await window.themeMode.current();
        isCurrentlyDark = systemIsDark === "dark";
      }

      setIsDark(isCurrentlyDark);
    };

    updateTheme();
  }, []);

  const handleToggle = async () => {
    let nextTheme: ThemeMode;

    // システムテーマの場合は、現在の表示状態に基づいて次のテーマを決定
    if (currentTheme === "system") {
      nextTheme = isDark ? "light" : "dark";
    } else {
      nextTheme = isDark ? "light" : "dark";
    }

    await setTheme(nextTheme);
    setCurrentTheme(nextTheme);
    setIsDark(!isDark);
  };

  return (
    <Button
      onClick={handleToggle}
      variant={variant}
      size="icon"
      aria-label={isDark ? "ライトテーマに切り替え" : "ダークテーマに切り替え"}
      className={`hover:bg-accent hover:text-accent-foreground ${
        variant === "outline" ? "border-border" : ""
      } ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
