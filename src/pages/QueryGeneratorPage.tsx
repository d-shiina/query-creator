import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Database,
  Settings,
  Code,
  Copy,
  Play,
  Loader2,
  Download,
  Trash2,
  Calendar,
  Plus,
  Minus,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { useQueryGenerator } from "@/hooks/useQueryGenerator";
import { KintoneAuth, KintoneApp, KintoneField } from "@/types/kintone";

interface QueryCondition {
  field: string;
  operator: string;
  value: string;
  logicalOperator: "and" | "or";
}

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
  { value: "in", label: "のいずれか (in)" },
  { value: "not in", label: "のいずれでもない (not in)" },
  { value: "like", label: "を含む (like)" },
  { value: "not like", label: "を含まない (not like)" },
];

const orderByOptions = [
  { value: "none", label: "並び替えなし" },
  { value: "$id asc", label: "レコード番号（昇順）" },
  { value: "$id desc", label: "レコード番号（降順）" },
  { value: "作成日時 asc", label: "作成日時（昇順）" },
  { value: "作成日時 desc", label: "作成日時（降順）" },
];

export default function QueryGeneratorPage({
  auth,
  app,
  onBack,
}: QueryGeneratorPageProps) {
  // Main states
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<KintoneField[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [error, setError] = useState<string>("");
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: "", operator: "=", value: "", logicalOperator: "and" },
  ]);
  const [orderBy, setOrderBy] = useState("none");
  const [limit, setLimit] = useState<number>();
  const [offset, setOffset] = useState<number>();
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    records: Record<string, unknown>[];
  } | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("table");

  // Saved queries
  const { savedQueries, deleteQuery } = useQueryGenerator(app.appId);

  // Format field value for display
  const formatFieldValue = (fieldData: unknown): string => {
    if (!fieldData) return "";

    // オブジェクトの場合、valueプロパティをチェック
    if (
      typeof fieldData === "object" &&
      fieldData !== null &&
      "value" in fieldData
    ) {
      const data = fieldData as { value: unknown; type?: string };
      const { value } = data;

      // ファイルフィールドの場合
      if (data.type === "FILE" && Array.isArray(value)) {
        return value
          .map((file: { name?: string }) => file.name || "")
          .join(", ");
      }

      // ユーザー選択フィールドの場合
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        "name" in value[0]
      ) {
        return value.map((user: { name: string }) => user.name).join(", ");
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

  // Load app fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log("Fetching fields for app:", app.appId);
        setLoading(true);
        setError("");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(window as any).kintoneAPI) {
          console.error("window.kintoneAPI is not available");
          setError(
            "KintoneAPIが利用できません。アプリケーションを再起動してください。",
          );
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Auto-generate query when conditions change
  useEffect(() => {
    generateQuery();
  }, [conditions, orderBy, limit, offset]);

  // Handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLoadQuery = (savedQuery: any) => {
    setConditions(savedQuery.conditions);
    setOrderBy(savedQuery.orderBy);
    setLimit(savedQuery.limit);
    setOffset(savedQuery.offset);
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

  const executeQuery = async () => {
    if (!generatedQuery) {
      alert("クエリが生成されていません");
      return;
    }

    try {
      setExecuting(true);
      setError("");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).kintoneAPI.executeQuery(
        auth,
        app.appId,
        generatedQuery,
      );

      if (result.success) {
        setQueryResult(result.data);
      } else {
        setError(result.error || "クエリの実行に失敗しました");
      }
    } catch (err) {
      console.error("Error executing query:", err);
      setError(
        `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
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
          <span>フィールド情報を読み込んでいます...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>戻る</span>
              </Button>

              <div className="border-border/60 border-l pl-6">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                    <Code className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-foreground text-lg font-semibold">
                      {app.name}
                    </h1>
                    <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                      <Database className="h-3 w-3" />
                      <span>アプリID: {app.appId}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <Settings className="h-3 w-3" />
                      <span className="text-muted-foreground">クエリ生成</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                アプリ管理
              </button>
            </li>
            <li className="text-muted-foreground">›</li>
            <li>
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
          {/* Saved Queries - Full Width */}
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

          {/* Main Layout: Query Builder + Results */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left: Query Builder */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>検索条件</CardTitle>
                  <CardDescription>
                    フィールドと条件を指定してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="bg-muted/20 rounded-lg border p-4"
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                条件 {index + 1}
                              </Badge>
                              {index > 0 && (
                                <Select
                                  value={condition.logicalOperator}
                                  onValueChange={(value: "and" | "or") =>
                                    updateCondition(index, {
                                      logicalOperator: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 w-16 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="and">AND</SelectItem>
                                    <SelectItem value="or">OR</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                              className="h-7 w-7 p-0"
                              disabled={conditions.length === 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                            <div className="md:col-span-4">
                              <Select
                                value={condition.field}
                                onValueChange={(value) =>
                                  updateCondition(index, { field: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="フィールドを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fields.map((field) => (
                                    <SelectItem
                                      key={field.code}
                                      value={field.code}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {field.label}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                          {field.code} ({field.type})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-3">
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateCondition(index, {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    operator: value as any,
                                  })
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
                              <Input
                                value={condition.value}
                                onChange={(e) =>
                                  updateCondition(index, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="値を入力"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      onClick={addCondition}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      条件を追加
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sort and Limit Options */}
              <Card>
                <CardHeader>
                  <CardTitle>並び替え・制限</CardTitle>
                  <CardDescription>
                    クエリの並び替えと取得件数を設定
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="orderBy"
                        className="mb-2 block text-sm font-medium"
                      >
                        並び替え
                      </Label>
                      <Select value={orderBy} onValueChange={setOrderBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderByOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="limit"
                          className="mb-2 block text-sm font-medium"
                        >
                          取得件数 (limit)
                        </Label>
                        <Input
                          id="limit"
                          type="number"
                          value={limit || ""}
                          placeholder="例: 100"
                          onChange={(e) =>
                            setLimit(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="offset"
                          className="mb-2 block text-sm font-medium"
                        >
                          スキップ件数 (offset)
                        </Label>
                        <Input
                          id="offset"
                          type="number"
                          value={offset || ""}
                          placeholder="例: 0"
                          onChange={(e) =>
                            setOffset(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Generated Query and Results */}
            <div className="space-y-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>生成されたクエリ</CardTitle>
                  <CardDescription>
                    Kintone REST APIで使用するクエリが表示されます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedQuery ? (
                      <>
                        <div className="bg-muted scrollbar-hover max-h-40 overflow-y-auto rounded-lg p-4">
                          <code className="text-foreground text-sm">
                            {generatedQuery}
                          </code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() =>
                              navigator.clipboard.writeText(generatedQuery)
                            }
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
                </CardContent>
              </Card>

              {/* Query Results */}
              {queryResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>実行結果</CardTitle>
                    <CardDescription>
                      {queryResult.records?.length || 0}
                      件のレコードが見つかりました
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
                                        {fields.find(
                                          (f) => f.code === fieldCode,
                                        )?.label || fieldCode}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.records
                                  .slice(0, 10)
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  .map((record: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-muted/30 border-b"
                                    >
                                      {Object.entries(record).map(
                                        ([fieldCode, fieldData]: [
                                          string,
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                                  ))}
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
    </div>
  );
}
