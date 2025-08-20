import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ToggleTheme from '@/components/ToggleTheme';
import { KintoneAuth, KintoneApp, KintoneField, QueryCondition } from '@/types/kintone';
import { ArrowLeft, Plus, Trash2, Copy, Play, Loader2, Code } from 'lucide-react';

interface QueryGeneratorPageProps {
  auth: KintoneAuth;
  app: KintoneApp;
  onBack: () => void;
}

const operators = [
  { value: '=', label: '等しい (=)' },
  { value: '!=', label: '等しくない (!=)' },
  { value: '>', label: 'より大きい (>)' },
  { value: '<', label: 'より小さい (<)' },
  { value: '>=', label: '以上 (>=)' },
  { value: '<=', label: '以下 (<=)' },
  { value: 'in', label: 'いずれかに該当 (in)' },
  { value: 'not in', label: 'いずれにも該当しない (not in)' },
  { value: 'like', label: '含む (like)' },
  { value: 'not like', label: '含まない (not like)' },
];

export default function QueryGeneratorPage({ auth, app, onBack }: QueryGeneratorPageProps) {
  console.log('QueryGeneratorPage mounted with:', { auth: auth.subdomain, app: app.name });
  
  const [fields, setFields] = useState<KintoneField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: '', operator: '=', value: '' }
  ]);
  const [orderBy, setOrderBy] = useState('none');
  const [limit, setLimit] = useState<number>();
  const [offset, setOffset] = useState<number>();
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  // Kintoneのフィールド値を適切に表示用文字列に変換する関数
  const formatFieldValue = (fieldData: any): string => {
    if (fieldData === null || fieldData === undefined) {
      return '';
    }
    
    // Kintoneの標準的なフィールド形式: {type: "...", value: "..."}
    if (typeof fieldData === 'object' && fieldData.value !== undefined) {
      const value = fieldData.value;
      
      // 配列の場合（チェックボックス、複数選択など）
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      // ファイルフィールドの場合
      if (fieldData.type === 'FILE' && Array.isArray(value)) {
        return value.map((file: any) => file.name || '').join(', ');
      }
      
      // ユーザー選択フィールドの場合
      if (Array.isArray(value) && value.length > 0 && value[0].name) {
        return value.map((user: any) => user.name).join(', ');
      }
      
      // その他のオブジェクト
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    }
    
    // 配列の場合
    if (Array.isArray(fieldData)) {
      return fieldData.map(item => String(item)).join(', ');
    }
    
    // オブジェクトの場合
    if (typeof fieldData === 'object') {
      return JSON.stringify(fieldData);
    }
    
    return String(fieldData);
  };

  // アプリのフィールド情報を取得
  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log('Fetching fields for app:', app.appId);
        setLoading(true);
        setError('');
        
        // window.kintoneAPIの存在をチェック
        if (!(window as any).kintoneAPI) {
          console.error('window.kintoneAPI is not available');
          setError('KintoneAPIが利用できません。アプリケーションを再起動してください。');
          return;
        }
        
        const result = await (window as any).kintoneAPI.getAppFields(auth, app.appId);
        console.log('Fields result:', result);
        
        if (result.success && result.data) {
          console.log('Fields loaded:', result.data.length);
          setFields(result.data);
        } else {
          console.error('Failed to fetch fields:', result.error);
          setError(result.error || 'フィールドの取得に失敗しました');
        }
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(`エラーが発生しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [auth, app.appId]);

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: '=', value: '', logicalOperator: 'and' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<QueryCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? { ...condition, ...updates } : condition
    ));
  };

  const generateQuery = () => {
    const validConditions = conditions.filter(c => c.field && c.value);
    
    if (validConditions.length === 0) {
      setGeneratedQuery('');
      return;
    }

    let query = '';
    
    validConditions.forEach((condition, index) => {
      if (index > 0 && condition.logicalOperator) {
        query += ` ${condition.logicalOperator} `;
      }
      
      const field = condition.field;
      const operator = condition.operator;
      let value = condition.value;
      
      // 値をクォートで囲む（数値以外）
      const fieldInfo = fields.find(f => f.code === field);
      if (fieldInfo && fieldInfo.type !== 'NUMBER') {
        value = `"${value}"`;
      }
      
      query += `${field} ${operator} ${value}`;
    });

    if (orderBy && orderBy !== 'none') {
      query += ` order by ${orderBy}`;
    }

    if (limit) {
      query += ` limit ${limit}`;
    }

    if (offset) {
      query += ` offset ${offset}`;
    }

    setGeneratedQuery(query);
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
    alert('クエリをクリップボードにコピーしました');
  };

  const executeQuery = async () => {
    if (!generatedQuery) {
      alert('まずクエリを生成してください');
      return;
    }

    try {
      setExecuting(true);
      const result = await (window as any).kintoneAPI.executeQuery(auth, app.appId, generatedQuery);
      
      if (result.success && result.data) {
        setQueryResult(result.data);
        alert(`クエリを実行しました。\n取得件数: ${result.data.records.length}件\n総件数: ${result.data.totalCount}件`);
      } else {
        alert(`クエリの実行に失敗しました: ${result.error}`);
      }
    } catch (error) {
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>フィールド情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">
                  クエリ生成 - {app.name}
                </h1>
                <p className="text-sm text-muted-foreground">アプリID: {app.appId}</p>
              </div>
            </div>
            <ToggleTheme />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: クエリビルダー */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>検索条件</CardTitle>
                <CardDescription>
                  フィールドと条件を設定してクエリを生成します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conditions.map((condition, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    {index > 0 && (
                      <div>
                        <Label>論理演算子</Label>
                        <Select
                          value={condition.logicalOperator || 'and'}
                          onValueChange={(value) => updateCondition(index, { logicalOperator: value as 'and' | 'or' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="and">AND</SelectItem>
                            <SelectItem value="or">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>フィールド</Label>
                        <Select
                          value={condition.field}
                          onValueChange={(value) => updateCondition(index, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="フィールドを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.code} value={field.code}>
                                {field.label} ({field.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>演算子</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(index, { operator: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>値</Label>
                        <Input
                          placeholder="値を入力"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    {conditions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        削除
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button onClick={addCondition} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  条件を追加
                </Button>
              </CardContent>
            </Card>

            {/* オプション設定 */}
            <Card>
              <CardHeader>
                <CardTitle>オプション</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>並び順 (ORDER BY)</Label>
                  <Select value={orderBy} onValueChange={setOrderBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="並び順を選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">なし</SelectItem>
                      {fields.map(field => (
                        <SelectItem key={field.code} value={field.code}>
                          {field.label} 昇順
                        </SelectItem>
                      ))}
                      {fields.map(field => (
                        <SelectItem key={`${field.code}_desc`} value={`${field.code} desc`}>
                          {field.label} 降順
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>取得件数上限 (LIMIT)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={limit || ''}
                      onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                  <div>
                    <Label>取得開始位置 (OFFSET)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={offset || ''}
                      onChange={(e) => setOffset(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={generateQuery} className="w-full" size="lg">
              <Code className="w-4 h-4 mr-2" />
              クエリ生成
            </Button>
          </div>

          {/* 右側: 結果表示 */}
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>生成されたクエリ</CardTitle>
                <CardDescription>
                  Kintone REST APIで使用するクエリが表示されます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="query" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="query">クエリ</TabsTrigger>
                    <TabsTrigger value="preview">プレビュー</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="query" className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 min-h-[200px]">
                      {generatedQuery ? (
                        <pre className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {JSON.stringify(generatedQuery)}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground text-center">
                          条件を設定してクエリを生成してください
                        </p>
                      )}
                    </div>
                    
                    {generatedQuery && (
                      <div className="flex gap-2">
                        <Button onClick={copyQuery} variant="outline" className="flex-1">
                          <Copy className="w-4 h-4 mr-2" />
                          コピー
                        </Button>
                        <Button onClick={executeQuery} className="flex-1" disabled={executing}>
                          {executing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {executing ? '実行中...' : 'クエリ実行'}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="preview" className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 min-h-[200px]">
                      <div className="text-sm space-y-2">
                        <div className="font-semibold text-foreground">API URL:</div>
                        <div className="bg-background border border-border p-2 rounded text-xs break-all text-foreground">
                          GET https://{auth.subdomain}.cybozu.com/k/v1/records.json?app={app.appId}
                          {generatedQuery && `&query=${encodeURIComponent(generatedQuery)}&totalCount=true`}
                        </div>
                        
                        <div className="font-semibold text-foreground">Request Headers:</div>
                        <div className="bg-background border border-border p-2 rounded text-xs">
                          <pre className="text-foreground">{JSON.stringify({
                            "X-Cybozu-Authorization": "Base64認証情報"
                          }, null, 2)}</pre>
                        </div>
                        
                        {generatedQuery && (
                          <>
                            <div className="font-semibold text-foreground">Query Parameter:</div>
                            <div className="bg-background border border-border p-2 rounded text-xs">
                              <pre className="text-foreground">query={JSON.stringify(generatedQuery)}</pre>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* クエリ実行結果表示 */}
            {queryResult && (
              <Card>
                <CardHeader>
                  <CardTitle>実行結果</CardTitle>
                  <CardDescription>
                    取得件数: {queryResult.records.length}件 / 総件数: {queryResult.totalCount}件
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="table" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="table">テーブル表示</TabsTrigger>
                      <TabsTrigger value="json">JSON表示</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="table" className="space-y-4">
                      {queryResult.records.length > 0 ? (
                        <div className="overflow-x-auto max-h-96 scrollbar-thin">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                {Object.keys(queryResult.records[0]).map(fieldCode => (
                                  <th key={fieldCode} className="p-2 text-left font-medium border-r">
                                    {fields.find(f => f.code === fieldCode)?.label || fieldCode}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.records.map((record: any, index: number) => (
                                <tr key={index} className="border-b hover:bg-muted/30">
                                  {Object.entries(record).map(([fieldCode, fieldData]: [string, any]) => (
                                    <td key={fieldCode} className="p-2 border-r max-w-48 overflow-hidden text-ellipsis">
                                      {formatFieldValue(fieldData)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">レコードがありません</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="json" className="space-y-4">
                      <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-hover border border-border">
                        <pre className="text-xs text-foreground">
                          {JSON.stringify(queryResult.records, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* フィールド一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>利用可能フィールド</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto scrollbar-hover">
                  {fields.map(field => (
                    <div key={field.code} className="flex justify-between items-center p-2 bg-muted rounded border border-border">
                      <div>
                        <div className="font-medium text-sm text-foreground">{field.label}</div>
                        <div className="text-xs text-muted-foreground">{field.code}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {field.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
