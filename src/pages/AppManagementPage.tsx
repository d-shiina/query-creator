import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ToggleTheme from '@/components/ToggleTheme';
import { KintoneApp, AppFilter, KintoneAuth } from '@/types/kintone';
import { Search, Star, StarOff, Settings, Play, Loader2 } from 'lucide-react';
import { getFavoriteApps, addToFavorites, removeFromFavorites, isAppFavorite } from '@/utils/favorites';
import { cleanAndTruncateText } from '@/utils/text';

interface AppManagementPageProps {
  auth: KintoneAuth;
  onSelectApp: (app: KintoneApp) => void;
  onLogout: () => void;
}

export default function AppManagementPage({ auth, onSelectApp, onLogout }: AppManagementPageProps) {
  const [apps, setApps] = useState<KintoneApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<AppFilter>({
    searchTerm: '',
    showFavoritesOnly: false,
  });

  // アプリ一覧を取得
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        setError('');
        
        const result = await (window as any).kintoneAPI.getApps(auth);
        
        if (result.success && result.data) {
          // お気に入り状態を設定
          const appsWithFavorites = result.data.map((app: any) => ({
            ...app,
            isFavorite: isAppFavorite(app.appId)
          }));
          setApps(appsWithFavorites);
        } else {
          setError(result.error || 'アプリの取得に失敗しました');
        }
      } catch (err) {
        setError(`エラーが発生しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [auth]);

  const toggleFavorite = (appId: string) => {
    const app = apps.find(a => a.appId === appId);
    if (!app) return;

    if (app.isFavorite) {
      removeFromFavorites(appId);
    } else {
      addToFavorites(appId);
    }

    // アプリリストを更新
    setApps(prevApps =>
      prevApps.map(app =>
        app.appId === appId ? { ...app, isFavorite: !app.isFavorite } : app
      )
    );
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
                         app.description?.toLowerCase().includes(filter.searchTerm.toLowerCase());
    const matchesFavorite = !filter.showFavoritesOnly || app.isFavorite;
    return matchesSearch && matchesFavorite;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-semibold">
              Kintone Query Creator
            </h1>
            <div className="flex items-center gap-2">
              <ToggleTheme />
              <Button variant="outline" onClick={onLogout}>
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              再読み込み
            </Button>
          </div>
        )}

        {/* ローディング */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>アプリを読み込み中...</span>
          </div>
        ) : (
          <>
            {/* フィルター・検索エリア */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="アプリ名で検索..."
                    value={filter.searchTerm}
                    onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={filter.showFavoritesOnly ? "default" : "outline"}
                  onClick={() => setFilter(prev => ({ ...prev, showFavoritesOnly: !prev.showFavoritesOnly }))}
                  className="whitespace-nowrap"
                >
                  <Star className={`w-4 h-4 mr-2 ${filter.showFavoritesOnly ? 'fill-current' : ''}`} />
                  お気に入りのみ
                </Button>
              </div>
            </div>

            {/* アプリ一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps.map(app => (
                <Card key={app.appId} className="hover:shadow-md transition-all duration-200 border-border hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate">{app.name}</CardTitle>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          ID: {app.appId}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(app.appId)}
                        className="flex-shrink-0"
                      >
                        {app.isFavorite ? (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="w-4 h-4 text-muted-foreground hover:text-yellow-400" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 min-h-[2.5rem] text-sm">
                      {cleanAndTruncateText(app.description || 'アプリの説明はありません', 80)}
                    </CardDescription>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onSelectApp(app)}
                        className="flex-1"
                        size="sm"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        クエリ生成
                      </Button>
                      <Button variant="outline" size="sm" className="px-3">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredApps.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {filter.searchTerm || filter.showFavoritesOnly
                    ? '条件に一致するアプリが見つかりません'
                    : 'アプリがありません'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
