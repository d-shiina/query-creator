import { useState } from 'react';
import { KintoneApp, KintoneAuth } from '@/types/kintone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Star, Play, Info, Calendar, User, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { addToFavorites, removeFromFavorites } from '@/utils/favorites';
import { cleanAndTruncateText } from '@/utils/text';

interface AppDataTableProps {
  apps: KintoneApp[];
  auth: KintoneAuth;
  onSelectApp: (app: KintoneApp) => void;
  onToggleFavorite: (appId: string) => void;
}

type SortField = 'appId' | 'name' | 'code' | 'creator' | 'modifiedAt';
type SortOrder = 'asc' | 'desc';

export default function AppDataTable({ apps, auth, onSelectApp, onToggleFavorite }: AppDataTableProps) {
  const [selectedAppInfo, setSelectedAppInfo] = useState<any>(null);
  const [appInfoLoading, setAppInfoLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('appId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1" /> : 
      <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const sortedApps = [...apps].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'appId':
        aValue = parseInt(a.appId);
        bValue = parseInt(b.appId);
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'code':
        aValue = a.code?.toLowerCase() || '';
        bValue = b.code?.toLowerCase() || '';
        break;
      case 'creator':
        aValue = a.creator?.name?.toLowerCase() || '';
        bValue = b.creator?.name?.toLowerCase() || '';
        break;
      case 'modifiedAt':
        aValue = new Date(a.modifiedAt || '').getTime();
        bValue = new Date(b.modifiedAt || '').getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const fetchAppInfo = async (app: KintoneApp) => {
    setAppInfoLoading(true);
    try {
      setSelectedAppInfo({
        appId: app.appId,
        name: app.name,
        description: app.description,
        code: app.code,
        creator: app.creator,
        modifier: app.modifier,
        createdAt: app.createdAt,
        modifiedAt: app.modifiedAt
      });
    } catch (error) {
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAppInfoLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-16">
              <Button 
                variant="ghost" 
                className="h-auto p-0 font-semibold hover:bg-transparent"
                onClick={() => handleSort('appId')}
              >
                ID
                {getSortIcon('appId')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button 
                variant="ghost" 
                className="h-auto p-0 font-semibold hover:bg-transparent"
                onClick={() => handleSort('name')}
              >
                アプリ名
                {getSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead className="w-24">
              <Button 
                variant="ghost" 
                className="h-auto p-0 font-semibold hover:bg-transparent"
                onClick={() => handleSort('code')}
              >
                コード
                {getSortIcon('code')}
              </Button>
            </TableHead>
            <TableHead className="w-32">
              <Button 
                variant="ghost" 
                className="h-auto p-0 font-semibold hover:bg-transparent"
                onClick={() => handleSort('creator')}
              >
                作成者
                {getSortIcon('creator')}
              </Button>
            </TableHead>
            <TableHead className="w-24">
              <Button 
                variant="ghost" 
                className="h-auto p-0 font-semibold hover:bg-transparent"
                onClick={() => handleSort('modifiedAt')}
              >
                更新日
                {getSortIcon('modifiedAt')}
              </Button>
            </TableHead>
            <TableHead className="w-20 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedApps.map((app) => (
            <TableRow key={app.appId} className="hover:bg-muted/50">
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(app.appId)}
                  className="h-6 w-6 p-0"
                >
                  {app.isFavorite ? (
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="w-3 h-3 text-muted-foreground hover:text-yellow-400" />
                  )}
                </Button>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {app.appId}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1 min-w-0">
                  <div className="font-medium truncate">{app.name}</div>
                  {app.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-[250px]" title={cleanAndTruncateText(app.description, 200)}>
                      {cleanAndTruncateText(app.description, 60)}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {app.code ? (
                  <Badge variant="outline" className="text-xs">
                    {app.code}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">未設定</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {app.creator?.name || '情報なし'}
                </div>
                {app.creator?.code && (
                  <div className="text-xs text-muted-foreground">
                    {app.creator.code}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {app.modifiedAt 
                    ? new Date(app.modifiedAt).toLocaleDateString('ja-JP')
                    : '情報なし'
                  }
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    onClick={() => onSelectApp(app)}
                    size="sm"
                    className="h-7 px-2"
                    title="クエリ生成"
                  >
                    <Zap className="w-3 h-3" />
                  </Button>
                  <Dialog onOpenChange={(open: boolean) => {
                    if (!open) {
                      setSelectedAppInfo(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => fetchAppInfo(app)}
                        title="詳細情報"
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Info className="w-5 h-5" />
                          アプリ詳細情報
                        </DialogTitle>
                        <DialogDescription>
                          {app.name} の詳細情報
                        </DialogDescription>
                      </DialogHeader>
                      {appInfoLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="ml-2">読み込み中...</span>
                        </div>
                      ) : selectedAppInfo ? (
                        <div className="space-y-6">
                          {/* 基本情報セクション */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground border-b pb-2">基本情報</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">アプリ名</label>
                                <div className="p-3 bg-muted/30 rounded-md border">
                                  <p className="text-sm font-medium">{selectedAppInfo.name}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">アプリID</label>
                                <div className="p-3 bg-muted/30 rounded-md border">
                                  <p className="text-sm font-mono font-medium">{selectedAppInfo.appId}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">アプリコード</label>
                              <div className="p-3 bg-muted/30 rounded-md border">
                                <p className="text-sm font-mono">
                                  {selectedAppInfo.code || <span className="text-muted-foreground italic">未設定</span>}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 説明セクション */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground border-b pb-2">説明</h3>
                            <div className="text-sm bg-muted/50 p-4 rounded-md border min-h-[80px]">
                              {selectedAppInfo.description ? (
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {cleanAndTruncateText(selectedAppInfo.description, 500)}
                                </p>
                              ) : (
                                <p className="text-muted-foreground italic text-center py-4">説明が設定されていません</p>
                              )}
                            </div>
                          </div>

                          {/* 作成・更新情報セクション */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground border-b pb-2">作成・更新情報</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* 作成情報 */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-green-600" />
                                  <label className="text-sm font-medium text-muted-foreground">作成者</label>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                                  <p className="text-sm font-medium">
                                    {(selectedAppInfo.creator?.name && selectedAppInfo.creator.name.trim()) || '情報なし'}
                                  </p>
                                  {selectedAppInfo.creator?.code && selectedAppInfo.creator.code.trim() && (
                                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedAppInfo.creator.code}</p>
                                  )}
                                  <div className="flex items-center gap-1 mt-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                      {selectedAppInfo.createdAt 
                                        ? new Date(selectedAppInfo.createdAt).toLocaleString('ja-JP') 
                                        : '情報なし'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 更新情報 */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-blue-600" />
                                  <label className="text-sm font-medium text-muted-foreground">最終更新者</label>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm font-medium">
                                    {(selectedAppInfo.modifier?.name && selectedAppInfo.modifier.name.trim()) || '情報なし'}
                                  </p>
                                  {selectedAppInfo.modifier?.code && selectedAppInfo.modifier.code.trim() && (
                                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedAppInfo.modifier.code}</p>
                                  )}
                                  <div className="flex items-center gap-1 mt-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                      {selectedAppInfo.modifiedAt 
                                        ? new Date(selectedAppInfo.modifiedAt).toLocaleString('ja-JP') 
                                        : '情報なし'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sortedApps.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            条件に一致するアプリが見つかりません
          </p>
        </div>
      )}
    </div>
  );
}
