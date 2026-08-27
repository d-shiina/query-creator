import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Database,
  Calendar,
  Edit,
  Search,
  Trash2,
  Star,
  X,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppHeader from "@/components/template/AppHeader";

import { useQueryGenerator } from "@/hooks/useQueryGenerator";
import { KintoneAuth, KintoneApp } from "@/types/kintone";
import {
  addQueryToFavorites,
  removeQueryFromFavorites,
  isQueryFavorite,
} from "@/utils/favorites";

// Helper function to generate query from conditions
const generateQueryFromConditions = (
  conditions: Array<{ field: string; operator: string; value: string }>,
  orderBy: string,
) => {
  if (!conditions || conditions.length === 0) {
    return orderBy && orderBy !== "none" ? `order by ${orderBy}` : "";
  }

  const conditionStrings = conditions.map((condition) => {
    const { field, operator, value } = condition;
    if (operator === "in" || operator === "not in") {
      // Handle array values for in/not in operators
      const values = Array.isArray(value) ? value : [value];
      const valueStr = values.map((v) => `"${v}"`).join(", ");
      return `${field} ${operator} (${valueStr})`;
    } else if (operator === "like" || operator === "not like") {
      return `${field} ${operator} "%${value}%"`;
    } else {
      return `${field} ${operator} "${value}"`;
    }
  });

  let query = conditionStrings.join(" and ");
  if (orderBy && orderBy !== "none") {
    query += ` order by ${orderBy}`;
  }

  return query;
};

interface QuerySelectionPageProps {
  auth: KintoneAuth;
  app: KintoneApp;
  onBack: () => void;
  onCreateNew: () => void;
  onEditQuery: (queryId: string) => void;
  onLogout: () => void;
}

export default function QuerySelectionPage({
  app,
  onBack,
  onCreateNew,
  onEditQuery,
  onLogout,
}: QuerySelectionPageProps) {
  console.log("QuerySelectionPage rendering with app:", app);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  // Add useQueryGenerator hook with delete function
  const { savedQueries, deleteQuery } = useQueryGenerator(app.appId);

  // キーボードショートカット for 戻る (Escape キー)
  // ダイアログやポップオーバーが開いている間はRadix側のEscape（閉じる）を優先し、
  // IME変換中のEscapeでは反応しない
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.ctrlKey || event.metaKey) return;
      if (event.isComposing) return;
      if (event.defaultPrevented) return;

      const hasOpenLayer = document.querySelector(
        '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"]',
      );
      if (hasOpenLayer) return;

      onBack();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack]);

  // お気に入り切り替え関数
  const toggleQueryFavorite = (queryId: string) => {
    if (isQueryFavorite(queryId)) {
      removeQueryFromFavorites(queryId);
    } else {
      addQueryToFavorites(queryId, app.appId);
    }
    setFavoritesVersion((prev) => prev + 1);
  };

  // チェックボックス選択関連
  const handleSelectQuery = (queryId: string, checked: boolean) => {
    if (checked) {
      setSelectedQueries(prev => [...prev, queryId]);
    } else {
      setSelectedQueries(prev => prev.filter(id => id !== queryId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQueries(filteredQueries.map(query => query.id));
    } else {
      setSelectedQueries([]);
    }
  };

  // 削除関連の関数
  const handleDeleteSingle = (queryId: string) => {
    setQueryToDelete(queryId);
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedQueries.length === 0) return;
    setQueryToDelete(null); // 一括削除の場合はnull
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (queryToDelete) {
        // 単一削除
        await deleteQuery(queryToDelete);
      } else {
        // 一括削除
        for (const queryId of selectedQueries) {
          await deleteQuery(queryId);
        }
        setSelectedQueries([]);
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setQueryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setQueryToDelete(null);
  };

  // フィルタリング済みクエリ
  const filteredQueries = useMemo(() => {
    if (!savedQueries) return [];

    return savedQueries.filter((query) => {
      // 検索フィルター
      if (
        searchTerm &&
        !query.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // お気に入りフィルター
      if (showFavoritesOnly && !isQueryFavorite(query.id)) {
        return false;
      }

      return true;
    });
  }, [savedQueries, searchTerm, showFavoritesOnly, favoritesVersion]);
  console.log("savedQueries:", savedQueries);
  console.log("savedQueries type:", typeof savedQueries);
  console.log("savedQueries length:", savedQueries?.length);
  console.log("savedQueries array check:", Array.isArray(savedQueries));

  // Step 2: Header with QueryGeneratorPage style
  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* Header */}
      <AppHeader
        onBack={onBack}
        backLabel="アプリ一覧に戻る"
        breadcrumb={[
          { label: "アプリ一覧", onClick: onBack },
          { label: app.name, truncate: true },
          { label: "クエリ管理" },
        ]}
        meta={
          <span className="text-muted-foreground shrink-0 px-1 text-xs">
            {savedQueries?.length || 0}件
          </span>
        }
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* Controls */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center space-x-4">
              {/* 検索バー */}
              <div className="relative max-w-md flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="クエリを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* お気に入りフィルター */}
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="flex items-center space-x-2"
              >
                <Star
                  className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`}
                />
                <span>お気に入り</span>
              </Button>

              {/* 一括削除ボタン */}
              {selectedQueries.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>選択削除 ({selectedQueries.length})</span>
                </Button>
              )}
            </div>

            {/* 新規作成ボタン */}
            <Button
              onClick={onCreateNew}
              className=""
            >
              <Plus className="mr-2 h-4 w-4" />
              新規クエリ作成
            </Button>
          </div>

          {/* Query list - Table format */}
          <div className="space-y-4">
            {!filteredQueries || filteredQueries.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">
                    {searchTerm || showFavoritesOnly
                      ? "条件に一致するクエリがありません"
                      : "クエリがありません"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || showFavoritesOnly
                      ? "検索条件を変更してください"
                      : "新規クエリを作成して始めましょう"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    保存されたクエリ ({filteredQueries.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <Checkbox
                            checked={selectedQueries.length === filteredQueries.length && filteredQueries.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="すべて選択"
                          />
                        </TableHead>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>クエリ名</TableHead>
                        <TableHead>メモ</TableHead>
                        <TableHead>生成されたクエリ</TableHead>
                        <TableHead>作成日</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueries.map((query) => (
                        <TableRow
                          key={query.id}
                          onClick={() => onEditQuery(query.id)}
                          className="cursor-pointer"
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedQueries.includes(query.id)}
                              onCheckedChange={(checked) => handleSelectQuery(query.id, checked as boolean)}
                              aria-label={`${query.name}を選択`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleQueryFavorite(query.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  isQueryFavorite(query.id)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground hover:text-yellow-400"
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {query.name}
                          </TableCell>
                          <TableCell>
                            <div className="text-muted-foreground max-w-[200px] truncate text-sm" title={query.memo}>
                              {query.memo || "メモなし"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted rounded px-2 py-1 font-mono text-xs max-w-[300px] block truncate" title={query.generatedQuery || generateQueryFromConditions(query.conditions, query.orderBy) || "クエリなし"}>
                              {query.generatedQuery ||
                                generateQueryFromConditions(
                                  query.conditions,
                                  query.orderBy,
                                ) ||
                                "クエリなし"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(query.createdAt).toLocaleDateString(
                                "ja-JP",
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditQuery(query.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingle(query.id);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>削除の確認</span>
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              {queryToDelete ? (
                <p>
                  クエリ「<strong>{savedQueries.find(q => q.id === queryToDelete)?.name}</strong>」を削除しますか？
                </p>
              ) : (
                <p>
                  選択した<strong>{selectedQueries.length}件</strong>のクエリを削除しますか？
                </p>
              )}
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-sm text-destructive">
                  <strong>⚠️ 注意：</strong>この操作は取り消せません。削除されたクエリは復元できません。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>削除中...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>削除</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
