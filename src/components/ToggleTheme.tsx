import { Moon, Sun } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentTheme, setTheme } from "@/helpers/theme_helpers";
import { ThemeMode } from "@/types/theme-mode";

export default function ToggleTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = async () => {
      const { local, system } = await getCurrentTheme();
      const activeTheme = local || 'system';
      setCurrentTheme(activeTheme);
      
      // 現在のダークモード状態を確認
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      setIsDark(isCurrentlyDark);
    };
    
    updateTheme();
  }, []);

  const handleToggle = async () => {
    const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
    await setTheme(nextTheme);
    setCurrentTheme(nextTheme);
    setIsDark(!isDark);
  };

  return (
    <Button 
      onClick={handleToggle} 
      variant="outline" 
      size="icon"
      className="border-border hover:bg-accent hover:text-accent-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
