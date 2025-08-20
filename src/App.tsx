import { useState, useEffect } from 'react';
import LoginPage from '@/pages/LoginPage';
import AppManagementPage from '@/pages/AppManagementPage';
import QueryGeneratorPage from '@/pages/QueryGeneratorPage';
import DragWindowRegion from '@/components/DragWindowRegion';
import { KintoneAuth, KintoneApp } from '@/types/kintone';
import { syncThemeWithLocal } from '@/helpers/theme_helpers';
import './styles/global.css';

type AppState = 'login' | 'appManagement' | 'queryGenerator';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [auth, setAuth] = useState<KintoneAuth | null>(null);
  const [selectedApp, setSelectedApp] = useState<KintoneApp | null>(null);

  // テーマの初期化
  useEffect(() => {
    syncThemeWithLocal();
  }, []);

  const handleLogin = (authData: KintoneAuth) => {
    setAuth(authData);
    setCurrentState('appManagement');
  };

  const handleLogout = () => {
    setAuth(null);
    setSelectedApp(null);
    setCurrentState('login');
  };

  const handleSelectApp = (app: KintoneApp) => {
    setSelectedApp(app);
    setCurrentState('queryGenerator');
  };

  const handleBackToApps = () => {
    setSelectedApp(null);
    setCurrentState('appManagement');
  };

  const renderContent = () => {
    switch (currentState) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      
      case 'appManagement':
        return auth ? (
          <AppManagementPage 
            auth={auth}
            onSelectApp={handleSelectApp} 
            onLogout={handleLogout} 
          />
        ) : <LoginPage onLogin={handleLogin} />;
      
      case 'queryGenerator':
        return selectedApp && auth ? (
          <QueryGeneratorPage 
            auth={auth}
            app={selectedApp} 
            onBack={handleBackToApps} 
          />
        ) : <LoginPage onLogin={handleLogin} />;
      
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DragWindowRegion title="Kintone Query Creator" />
      <div className="flex-1 overflow-auto scrollbar-thin">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
