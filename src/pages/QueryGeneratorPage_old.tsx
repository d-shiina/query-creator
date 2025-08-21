import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ToggleTheme from "@/components/ToggleTheme";
import {
  KintoneAuth,
  KintoneApp,
  KintoneField,
  QueryCondition,
} from "@/types/kintone";
import { useQueryGenerator } from "@/hooks/useQueryGenerator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Play,
  Loader2,
  Code,
  ChevronRight,
  ChevronLeft,
  Save,
  Download,
  Calendar,
} from "lucide-react";

interface QueryGeneratorPageProps {
  auth: KintoneAuth;
  app: KintoneApp;
  onBack: () => void;
}

const operators = [
  { value: "=", label: "等しい (=)" },
  { value: "!=", label: "等しくない (!=)" },
  { value: ">", label: "より大きい (>)" },
  { value: "<", label: "より小さい (<)" },
  { value: ">=", label: "以上 (>=)" },
  { value: "<=", label: "以下 (<=)" },
  { value: "in", label: "いずれかに該当 (in)" },
  { value: "not in", label: "いずれにも該当しない (not in)" },
  { value: "like", label: "含む (like)" },
  { value: "not like", label: "含まない (not like)" },
];

export default function QueryGeneratorPage({
  auth,
  app,
  onBack,
}: QueryGeneratorPageProps) {
  console.log("QueryGeneratorPage mounted with:", {
    auth: auth.subdomain,
    app: app.name,
  });

  const [fields, setFields] = useState<KintoneField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: "", operator: "=", value: "" },
  ]);
  const [orderBy, setOrderBy] = useState("none");
  const [limit, setLimit] = useState<number>();
  const [offset, setOffset] = useState<number>();
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [activeQueryTab, setActiveQueryTab] = useState("query");
  const [activeResultTab, setActiveResultTab] = useState("table");

  // Query saving states
  const [queryName, setQueryName] = useState("");

  // Use query generator hook
  const { savedQueries, saveQuery, deleteQuery } = useQueryGenerator(app.appId);

  // Kintoneのフィールド値を適切に表示用文字列に変換する関数
  const formatFieldValue = (fieldData: any): string => {
    if (fieldData === null || fieldData === undefined) {
      return "";
    }

    // Kintoneの標準的なフィールド形式: {type: "...", value: "..."}
    if (typeof fieldData === "object" && fieldData.value !== undefined) {
      const value = fieldData.value;

      // 配列の場合（チェックボックス、複数選択など）
      if (Array.isArray(value)) {
        return value.join(", ");
      }

      // ファイルフィールドの場合
      if (fieldData.type === "FILE" && Array.isArray(value)) {
        return value.map((file: any) => file.name || "").join(", ");
      }

      // ユーザー選択フィールドの場合
      if (Array.isArray(value) && value.length > 0 && value[0].name) {
        return value.map((user: any) => user.name).join(", ");
      }

      // その他のオブジェクト
      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      return String(value);
    }

    // 配列の場合
    if (Array.isArray(fieldData)) {
      return fieldData.map((item) => String(item)).join(", ");
    }

    // オブジェクトの場合
    if (typeof fieldData === "object") {
      return JSON.stringify(fieldData);
    }

    return String(fieldData);
  };

  // アプリのフィールド情報を取得
  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log("Fetching fields for app:", app.appId);
        setLoading(true);
        setError("");

        // window.kintoneAPIの存在をチェック
        if (!(window as any).kintoneAPI) {
          console.error("window.kintoneAPI is not available");
          setError(
            "KintoneAPIが利用できません。アプリケーションを再起動してください。",
          );
          return;
        }

        const result = await (window as any).kintoneAPI.getAppFields(
          auth,
          app.appId,
        );
        console.log("Fields result:", result);

        if (result.success && result.data && result.data.fields) {
          console.log("Fields loaded:", result.data.fields.length);
          setFields(result.data.fields);
        } else {
          console.error("Failed to fetch fields:", result.error);
          setError(result.error || "フィールドの取得に失敗しました");
        }
      } catch (err) {
        console.error("Error fetching fields:", err);
        setError(
          `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [auth, app.appId]);

  // リアルタイムクエリ生成 - 条件が変更されたときに自動でクエリを生成
  useEffect(() => {
    generateQuery();
  }, [conditions, orderBy, limit, offset]);

  // Query save/load handlers
  const handleSaveQuery = () => {
    if (!queryName.trim()) {
      alert("クエリ名を入力してください");
      return;
    }

    const validConditions = conditions.filter((c) => c.field && c.value);
    if (validConditions.length === 0) {
      alert("保存する条件がありません");
      return;
    }

    saveQuery(queryName.trim(), conditions, orderBy, limit, offset);
    setQueryName("");
  };

  const handleLoadQuery = (savedQuery: any) => {
    setConditions(savedQuery.conditions);
    setOrderBy(savedQuery.orderBy);
    setLimit(savedQuery.limit);
    setOffset(savedQuery.offset);
    // Regenerate query after loading
    setTimeout(() => {
      generateQuery();
    }, 100);
  };

  const handleDeleteQuery = (queryId: string) => {
    if (confirm("このクエリを削除しますか？")) {
      deleteQuery(queryId);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "", operator: "=", value: "", logicalOperator: "and" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<QueryCondition>) => {
    setConditions(
      conditions.map((condition, i) =>
        i === index ? { ...condition, ...updates } : condition,
      ),
    );
  };

  const generateQuery = () => {
    const validConditions = conditions.filter((c) => c.field && c.value);

    if (validConditions.length === 0) {
      setGeneratedQuery("");
      return;
    }

    let query = "";

    validConditions.forEach((condition, index) => {
      if (index > 0 && condition.logicalOperator) {
        query += ` ${condition.logicalOperator} `;
      }

      const field = condition.field;
      const operator = condition.operator;
      let value = condition.value;

      // 値をクォートで囲む（数値以外）
      const fieldInfo = fields.find((f) => f.code === field);
      if (fieldInfo && fieldInfo.type !== "NUMBER") {
        value = `"${value}"`;
      }

      query += `${field} ${operator} ${value}`;
    });

    if (orderBy && orderBy !== "none") {
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
    alert("クエリをクリップボードにコピーしました");
  };

  const executeQuery = async () => {
    if (!generatedQuery) {
      alert("まずクエリを生成してください");
      return;
    }

    try {
      setExecuting(true);
      const result = await (window as any).kintoneAPI.executeQuery(
        auth,
        app.appId,
        generatedQuery,
      );

      if (result.success && result.data) {
        setQueryResult(result.data);
        alert(
          `クエリを実行しました。\n取得件数: ${result.data.records.length}件\n総件数: ${result.data.totalCount}件`,
        );
      } else {
        alert(`クエリの実行に失敗しました: ${result.error}`);
      }
    } catch (error) {
      alert(
        `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>フィールド情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* ヘッダー */}
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-muted/60 group h-9 w-9 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span className="sr-only">戻る</span>
              </Button>
              <div className="border-border/60 border-l pl-6">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                    <Code className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-foreground text-xl font-bold">
                      クエリ生成
                    </h1>
                    <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                      <span className="text-foreground/80 font-medium">
                        {app.name}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="bg-muted/50 rounded-md px-2 py-0.5 font-mono text-xs">
                        ID: {app.appId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ToggleTheme />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ブレッドクラム */}
        <nav className="mb-6" aria-label="ブレッドクラム">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                アプリ一覧
              </button>
            </li>
            <li className="flex items-center">
              <ChevronRight className="text-muted-foreground mx-2 h-4 w-4" />
              <span className="text-foreground font-medium">{app.name}</span>
            </li>
            <li className="flex items-center">
              <ChevronRight className="text-muted-foreground mx-2 h-4 w-4" />
              <span className="text-muted-foreground">クエリ生成</span>
            </li>
          </ol>
        </nav>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 mb-6 rounded-lg border p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* 保存済みクエリ - 2カラム全体幅 */}
          <Card>
            <CardHeader>
              <CardTitle>保存済みクエリ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="scrollbar-hover max-h-64 space-y-2 overflow-y-auto">
                {savedQueries.length === 0 ? (
                  <div className="text-muted-foreground py-6 text-center">
                    <Save className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">保存されたクエリはありません</p>
                  </div>
                ) : (
                  savedQueries.map((query) => (
                    <div
                      key={query.id}
                      className="bg-muted border-border hover:bg-muted/80 flex items-center justify-between rounded border p-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-sm font-medium">
                          {query.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {query.conditions.length}条件
                          </Badge>
                          <div className="text-muted-foreground flex items-center text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(query.createdAt).toLocaleDateString(
                              "ja-JP",
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoadQuery(query)}
                          className="h-8 px-2 text-xs"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          読込
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQuery(query.id)}
                          className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* メインレイアウト：左右2カラム */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
                  <div
                    key={index}
                    className="border-border space-y-3 rounded-lg border p-4"
                  >
                    {index > 0 && (
                      <div>
                        <Label>論理演算子</Label>
                        <Select
                          value={condition.logicalOperator || "and"}
                          onValueChange={(value) =>
                            updateCondition(index, {
                              logicalOperator: value as "and" | "or",
                            })
                          }
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

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <Label>フィールド</Label>
                        <Select
                          value={condition.field}
                          onValueChange={(value) =>
                            updateCondition(index, { field: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="フィールドを選択">
                              {condition.field && (
                                <span className="truncate">
                                  {fields.find(
                                    (f) => f.code === condition.field,
                                  )?.label || condition.field}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((field) => (
                              <SelectItem key={field.code} value={field.code}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {field.label}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {field.code}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-3">
                        <Label>演算子</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) =>
                            updateCondition(index, { operator: value as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-5">
                        <Label>値</Label>
                        <Input
                          placeholder="値を入力"
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(index, { value: e.target.value })
                          }
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
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  onClick={addCondition}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
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
                      {fields.map((field) => (
                        <SelectItem key={field.code} value={field.code}>
                          <div className="flex w-full items-center justify-between">
                            <span className="truncate">{field.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              昇順
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {fields.map((field) => (
                        <SelectItem
                          key={`${field.code}_desc`}
                          value={`${field.code} desc`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="truncate">{field.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              降順
                            </span>
                          </div>
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
                      value={limit || ""}
                      onChange={(e) =>
                        setLimit(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>取得開始位置 (OFFSET)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={offset || ""}
                      onChange={(e) =>
                        setOffset(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <Tabs
                  value={activeQueryTab}
                  onValueChange={setActiveQueryTab}
                  className="w-full"
                >
                  <TabsList className="bg-muted relative grid w-full grid-cols-2 overflow-hidden rounded-lg border-0 p-1">
                    <TabsTrigger
                      value="query"
                      className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                    >
                      クエリ
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                    >
                      実行結果
                    </TabsTrigger>
                    {/* スライド背景 */}
                    <div
                      className={`bg-background border-border absolute top-1 bottom-1 left-1 w-[calc(50%-0.125rem)] rounded-md border shadow-md transition-transform duration-300 ease-out ${
                        activeQueryTab === "preview"
                          ? "translate-x-full"
                          : "translate-x-0"
                      }`}
                    />
                  </TabsList>

                  <TabsContent value="query" className="space-y-4">
                    <div className="bg-muted relative min-h-[200px] rounded-lg p-4">
                      {generatedQuery ? (
                        <>
                          <pre className="text-foreground mb-12 text-sm break-words whitespace-pre-wrap">
                            {JSON.stringify(generatedQuery)}
                          </pre>
                          <div className="absolute right-4 bottom-4 left-4 flex gap-2">
                            <Button
                              onClick={copyQuery}
                              variant="outline"
                              size="sm"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              コピー
                            </Button>
                            <Button
                              onClick={executeQuery}
                              size="sm"
                              disabled={executing}
                            >
                              {executing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              {executing ? "実行中..." : "実行"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-center">
                          条件を設定してクエリを生成してください
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="bg-muted min-h-[200px] rounded-lg p-4">
                      {queryResult ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-foreground text-sm font-medium">
                              取得件数: {queryResult.records.length}件
                            </div>
                            {queryResult.totalCount && (
                              <div className="text-muted-foreground text-sm">
                                総件数: {queryResult.totalCount}件
                              </div>
                            )}
                          </div>

                          <div className="bg-background border-border max-h-96 overflow-auto rounded border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 border-border border-b">
                                <tr>
                                  {fields.slice(0, 5).map((field) => (
                                    <th
                                      key={field.code}
                                      className="px-3 py-2 text-left font-medium"
                                    >
                                      {field.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.records
                                  .slice(0, 10)
                                  .map((record: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-border/50 border-b"
                                    >
                                      {fields.slice(0, 5).map((field) => (
                                        <td
                                          key={field.code}
                                          className="max-w-xs truncate px-3 py-2"
                                        >
                                          {formatFieldValue(record[field.code])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>

                          {queryResult.records.length > 10 && (
                            <div className="text-muted-foreground text-center text-xs">
                              最初の10件のみ表示中
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center">
                          クエリを実行すると結果が表示されます
                        </p>
                      )}
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
                    取得件数: {queryResult.records.length}件 / 総件数:{" "}
                    {queryResult.totalCount}件
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeResultTab}
                    onValueChange={setActiveResultTab}
                    className="w-full"
                  >
                    <TabsList className="bg-muted relative grid w-full grid-cols-2 overflow-hidden rounded-lg border-0 p-1">
                      <TabsTrigger
                        value="table"
                        className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                      >
                        テーブル表示
                      </TabsTrigger>
                      <TabsTrigger
                        value="json"
                        className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                      >
                        JSON表示
                      </TabsTrigger>
                      {/* スライド背景 */}
                      <div
                        className={`bg-background border-border absolute top-1 bottom-1 left-1 w-[calc(50%-0.125rem)] rounded-md border shadow-md transition-transform duration-300 ease-out ${
                          activeResultTab === "json"
                            ? "translate-x-full"
                            : "translate-x-0"
                        }`}
                      />
                    </TabsList>

                    <TabsContent value="table" className="space-y-4">
                      {queryResult.records.length > 0 ? (
                        <div className="scrollbar-thin max-h-96 overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                {Object.keys(queryResult.records[0]).map(
                                  (fieldCode) => (
                                    <th
                                      key={fieldCode}
                                      className="border-r p-2 text-left font-medium"
                                    >
                                      {fields.find((f) => f.code === fieldCode)
                                        ?.label || fieldCode}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.records.map(
                                (record: any, index: number) => (
                                  <tr
                                    key={index}
                                    className="hover:bg-muted/30 border-b"
                                  >
                                    {Object.entries(record).map(
                                      ([fieldCode, fieldData]: [
                                        string,
                                        any,
                                      ]) => (
                                        <td
                                          key={fieldCode}
                                          className="max-w-48 overflow-hidden border-r p-2 text-ellipsis"
                                        >
                                          {formatFieldValue(fieldData)}
                                        </td>
                                      ),
                                    )}
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-8 text-center">
                          レコードがありません
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="json" className="space-y-4">
                      <div className="bg-muted scrollbar-hover border-border max-h-96 overflow-y-auto rounded-lg border p-4">
                        <pre className="text-foreground text-xs">
                          {JSON.stringify(queryResult.records, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
