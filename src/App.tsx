import React, { useState, useEffect } from "react";
import LoginPage from "@/pages/LoginPage";
import AppManagementPage from "@/pages/AppManagementPage";
import QueryGeneratorPage from "@/pages/QueryGeneratorPage";
import SimpleFooter from "@/components/template/SimpleFooter";
import WindowControls from "@/components/template/WindowControls";
import { KintoneAuth, KintoneApp } from "@/types/kintone";
import { syncThemeWithLocal } from "@/helpers/theme_helpers";
import { ToastProvider } from "@/components/ui/toast";
import "./styles/global.css";

type AppState = "login" | "appManagement" | "queryGenerator";

function App() {
  const [currentState, setCurrentState] = useState<AppState>("login");
  const [auth, setAuth] = useState<KintoneAuth | null>(null);
  const [selectedApp, setSelectedApp] = useState<KintoneApp | null>(null);

  // テーマの初期化
  useEffect(() => {
    syncThemeWithLocal();
  }, []);

  const handleLogin = (authData: KintoneAuth) => {
    setAuth(authData);
    setCurrentState("appManagement");
  };

  const handleLogout = () => {
    setAuth(null);
    setSelectedApp(null);
    setCurrentState("login");
  };

  const handleSelectApp = (app: KintoneApp) => {
    setSelectedApp(app);
    // AppManagementPageの内部遷移に任せる（queryGeneratorに直接遷移しない）
  };

  const handleBackToApps = () => {
    setSelectedApp(null);
    setCurrentState("appManagement");
  };

  const renderContent = () => {
    switch (currentState) {
      case "login":
        return <LoginPage onLogin={handleLogin} />;

      case "appManagement":
        return auth ? (
          <AppManagementPage
            auth={auth}
            onSelectApp={handleSelectApp}
            onLogout={handleLogout}
          />
        ) : (
          <LoginPage onLogin={handleLogin} />
        );

      case "queryGenerator":
        return selectedApp && auth ? (
          <QueryGeneratorPage
            auth={auth}
            app={selectedApp}
            onBack={handleBackToApps}
            onLogout={handleLogout}
          />
        ) : (
          <LoginPage onLogin={handleLogin} />
        );

      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <ToastProvider>
      {/* ウィンドウ高に収め、スクロールは本体側だけで行う。
          タイトルバーの帯は持たず、各画面のヘッダーがドラッグ領域を兼ねる */}
      <div className="flex h-screen flex-col overflow-hidden">
        <WindowControls />
        <div className="scrollbar-thin relative min-h-0 flex-1 overflow-auto pb-16">
          {renderContent()}
        </div>
        <SimpleFooter />
      </div>
    </ToastProvider>
  );
}

export default App;
