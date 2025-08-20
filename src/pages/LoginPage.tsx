import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/ui/password-input';
import ToggleTheme from '@/components/ToggleTheme';
import { KintoneAuth } from '@/types/kintone';
import { Lock, User, Globe, AlertCircle, Settings } from 'lucide-react';

interface LoginPageProps {
  onLogin: (auth: KintoneAuth) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<KintoneAuth>({
    subdomain: '',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberCredentials, setRememberCredentials] = useState(false);

  // LocalStorageから保存された認証情報を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kintone-credentials');
      if (saved) {
        const { subdomain, username, remember } = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          subdomain: subdomain || '',
          username: username || ''
        }));
        setRememberCredentials(remember || false);
      }
    } catch (error) {
      console.error('Failed to load saved credentials:', error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // 簡単なバリデーション
    if (!formData.subdomain) {
      setError('サブドメインを入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.username || !formData.password) {
      setError('ログインIDとパスワードを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      // 実際のKintone APIでログイン認証
      console.log('=== Login Form Data ===');
      console.log('Subdomain:', formData.subdomain);
      console.log('Username:', formData.username);
      console.log('Password length:', formData.password.length);
      console.log('Password starts with:', formData.password.substring(0, 3) + '...');
      
      const result = await (window as any).kintoneAPI.login(formData);
      
      if (result.success) {
        // 認証成功時に認証情報を保存（パスワードは保存しない）
        if (rememberCredentials) {
          try {
            localStorage.setItem('kintone-credentials', JSON.stringify({
              subdomain: formData.subdomain,
              username: formData.username,
              remember: true
            }));
          } catch (error) {
            console.error('Failed to save credentials:', error);
          }
        } else {
          // チェックボックスがオフの場合は保存された認証情報を削除
          localStorage.removeItem('kintone-credentials');
        }
        
        onLogin(formData);
      } else {
        console.error('Login failed:', result.error);
        setError(`${result.error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof KintoneAuth) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ToggleTheme />
      </div>
      
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold">
            Kintone Query Creator
          </CardTitle>
          <CardDescription>
            Kintoneアカウントでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {/* サブドメイン */}
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-sm font-medium">
                サブドメイン
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="subdomain"
                  placeholder="your-company"
                  value={formData.subdomain}
                  onChange={handleChange('subdomain')}
                  className="pl-10 pr-20"
                  required
                />
                <div className="absolute right-3 top-3 text-sm text-muted-foreground">
                  .cybozu.com
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                例: https://your-company.cybozu.com の「your-company」部分
              </p>
            </div>

            {/* ログインID */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                ログインID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="ログインID"
                  value={formData.username}
                  onChange={handleChange('username')}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* パスワード */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                パスワード
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput
                  id="password"
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* 認証情報を保存 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberCredentials}
                onCheckedChange={(checked: boolean) => setRememberCredentials(checked)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                サブドメインとログインIDを保存する
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          {/* DevTools Control */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (window as any).electronWindow?.toggleDevTools()}
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              DevTools
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>パスワード認証でKintone APIに接続します</p>
            <p>パスワードは保存されません</p>
            <p className="text-primary">
              CORS回避のためElectronのネットワーク機能を使用
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
