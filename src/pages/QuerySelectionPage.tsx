import React, { useState, useMemo } from "react";
import {
  Plus,
  Database,
  Calendar,
  Edit,
  Search,
  Trash2,
  ChevronRight,
  Star,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ToggleTheme from "@/components/ToggleTheme";

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

  // Add useQueryGenerator hook with delete function
  const { savedQueries, deleteQuery } = useQueryGenerator(app.appId);

  // お気に入り切り替え関数
  const toggleQueryFavorite = (queryId: string) => {
    if (isQueryFavorite(queryId)) {
      removeQueryFromFavorites(queryId);
    } else {
      addQueryToFavorites(queryId, app.appId);
    }
    // 状態更新のためのフォース更新（再レンダリング）
    setSearchTerm((prev) => prev);
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
  }, [savedQueries, searchTerm, showFavoritesOnly]);
  console.log("savedQueries:", savedQueries);
  console.log("savedQueries type:", typeof savedQueries);
  console.log("savedQueries length:", savedQueries?.length);
  console.log("savedQueries array check:", Array.isArray(savedQueries));

  // Step 2: Header with QueryGeneratorPage style
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                <Database className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-foreground text-lg font-semibold">
                  {app.name}
                </h1>
                <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                  <Search className="h-3 w-3" />
                  <span>クエリ管理</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>{savedQueries?.length || 0}件のクエリ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ToggleTheme />
              <Button
                variant="outline"
                onClick={onLogout}
                className="hover:bg-muted/60 transition-colors"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="text-muted-foreground flex items-center space-x-2 text-sm">
              <li>
                <button
                  onClick={onBack}
                  className="hover:text-foreground transition-colors"
                >
                  アプリ一覧
                </button>
              </li>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li className="text-foreground font-medium">{app.name}</li>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li className="text-foreground font-medium">クエリ管理</li>
            </ol>
          </nav>

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
            </div>

            {/* 新規作成ボタン */}
            <Button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg"
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
                        <TableHead className="w-8"></TableHead>
                        <TableHead>クエリ名</TableHead>
                        <TableHead>生成されたクエリ</TableHead>
                        <TableHead>作成日</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueries.map((query) => (
                        <TableRow key={query.id}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleQueryFavorite(query.id)}
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
                            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
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
                                onClick={() => deleteQuery(query.id)}
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
    </div>
  );
}
