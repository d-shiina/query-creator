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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ToggleTheme from "@/components/ToggleTheme";
import AppDataTable from "@/components/AppDataTable";
import QuerySelectionPage from "./QuerySelectionPage";
import QueryGeneratorPage from "./QueryGeneratorPage";
import { KintoneApp, AppFilter, KintoneAuth } from "@/types/kintone";
import {
  Search,
  Star,
  Loader2,
  Info,
  Calendar,
  User,
  Grid3X3,
  Table2,
  Code2,
  Save,
} from "lucide-react";
import {
  addToFavorites,
  removeFromFavorites,
  isAppFavorite,
} from "@/utils/favorites";
import { cleanAndTruncateText } from "@/utils/text";
import { getQueryCount } from "@/hooks/useQueryGenerator";

interface AppManagementPageProps {
  auth: KintoneAuth;
  onSelectApp: (app: KintoneApp) => void;
  onLogout: () => void;
}

export default function AppManagementPage({
  auth,
  onSelectApp,
  onLogout,
}: AppManagementPageProps) {
  const [apps, setApps] = useState<KintoneApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedAppInfo, setSelectedAppInfo] = useState<KintoneApp | null>(
    null,
  );
  const [appInfoLoading, setAppInfoLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentView, setCurrentView] = useState<
    "apps" | "querySelection" | "queryGenerator"
  >("apps");
  const [selectedApp, setSelectedApp] = useState<KintoneApp | null>(null);
  const [editingQueryId, setEditingQueryId] = useState<string | undefined>(
    undefined,
  );
  const [filter, setFilter] = useState<AppFilter>({
    searchTerm: "", // 後方互換性のため残す
    showFavoritesOnly: false,
    appId: "",
    appName: "",
    appCode: "",
    creator: "",
    updatedDate: "",
  });

  // アプリ一覧を取得
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        setError("");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (window as any).kintoneAPI.getApps(auth);

        if (result.success && result.data && result.data.apps) {
          console.log("Apps API response:", result.data);
          // ブックマーク状態を設定
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const appsWithFavorites = result.data.apps.map((app: any) => {
            console.log(`App ${app.appId} creator:`, app.creator);
            console.log(`App ${app.appId} modifier:`, app.modifier);
            return {
              appId: app.appId,
              code: app.code,
              name: app.name,
              description: app.description,
              spaceId: app.spaceId,
              threadId: app.threadId,
              createdAt: app.createdAt,
              modifiedAt: app.modifiedAt,
              creator: app.creator,
              modifier: app.modifier,
              isFavorite: isAppFavorite(app.appId),
            };
          });
          setApps(appsWithFavorites);
        } else {
          setError(result.error || "アプリの取得に失敗しました");
        }
      } catch (err) {
        setError(
          `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [auth]);

  // Listen for localStorage changes to update query counts
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("kintone_saved_queries_")) {
        // Query count update logic can be added here if needed
      }
    };

    const handleCustomStorageChange = () => {
      // Query count update logic can be added here if needed
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageUpdate", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageUpdate",
        handleCustomStorageChange,
      );
    };
  }, []);

  const toggleFavorite = (appId: string) => {
    const app = apps.find((a) => a.appId === appId);
    if (!app) return;

    if (app.isFavorite) {
      removeFromFavorites(appId);
    } else {
      addToFavorites(appId);
    }

    // アプリリストを更新
    setApps((prevApps) =>
      prevApps.map((app) =>
        app.appId === appId ? { ...app, isFavorite: !app.isFavorite } : app,
      ),
    );
  };

  // アプリ詳細情報を取得（アプリ一覧から既存の情報を使用）
  const fetchAppInfo = async (appId: string) => {
    setAppInfoLoading(true);
    try {
      // アプリ一覧から既存の情報を取得（APIレスポンスに含まれている）
      const existingApp = apps.find((app) => app.appId === appId);

      if (existingApp) {
        console.log("Using app info from list:", existingApp);
        setSelectedAppInfo({
          appId: existingApp.appId,
          name: existingApp.name,
          description: existingApp.description,
          code: existingApp.code,
          spaceId: existingApp.spaceId,
          threadId: existingApp.threadId,
          creator: existingApp.creator,
          modifier: existingApp.modifier,
          createdAt: existingApp.createdAt,
          modifiedAt: existingApp.modifiedAt,
        });
      } else {
        alert("アプリ情報が見つかりません");
      }
    } catch (error) {
      alert(
        `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setAppInfoLoading(false);
    }
  };

  const filteredApps = apps.filter((app) => {
    // フィルターが何も設定されていない場合はすべて表示
    const hasFilters =
      filter.searchTerm ||
      filter.showFavoritesOnly ||
      filter.appId ||
      filter.appName ||
      filter.appCode ||
      filter.creator ||
      filter.updatedDate;
    if (!hasFilters) return true;

    // 各検索条件のチェック
    let matchesSearch = true;

    // 旧式の全体検索（後方互換性のため）
    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase();
      matchesSearch =
        app.name.toLowerCase().includes(searchTerm) ||
        app.description?.toLowerCase().includes(searchTerm) ||
        false ||
        app.appId.toLowerCase().includes(searchTerm) ||
        app.code?.toLowerCase().includes(searchTerm) ||
        false ||
        app.creator?.name?.toLowerCase().includes(searchTerm) ||
        false ||
        app.creator?.code?.toLowerCase().includes(searchTerm) ||
        false ||
        app.modifier?.name?.toLowerCase().includes(searchTerm) ||
        false ||
        app.modifier?.code?.toLowerCase().includes(searchTerm) ||
        false;
    }

    // 新しい複合検索条件
    if (
      filter.appId &&
      !app.appId.toLowerCase().includes(filter.appId.toLowerCase())
    ) {
      matchesSearch = false;
    }
    if (
      filter.appName &&
      !app.name.toLowerCase().includes(filter.appName.toLowerCase())
    ) {
      matchesSearch = false;
    }
    if (
      filter.appCode &&
      !(app.code?.toLowerCase().includes(filter.appCode.toLowerCase()) || false)
    ) {
      matchesSearch = false;
    }
    if (
      filter.creator &&
      !(
        app.creator?.name
          ?.toLowerCase()
          .includes(filter.creator.toLowerCase()) ||
        false ||
        app.creator?.code
          ?.toLowerCase()
          .includes(filter.creator.toLowerCase()) ||
        false
      )
    ) {
      matchesSearch = false;
    }
    if (
      filter.updatedDate &&
      !(
        app.updatedAt?.includes(filter.updatedDate) ||
        false ||
        app.modifiedAt?.includes(filter.updatedDate) ||
        false
      )
    ) {
      matchesSearch = false;
    }

    // ブックマークフィルターのチェック
    const matchesFavorite = !filter.showFavoritesOnly || app.isFavorite;

    return matchesSearch && matchesFavorite;
  });

  // Navigation handlers
  const handleAppSelect = (app: KintoneApp) => {
    console.log("handleAppSelect called with app:", app);
    setSelectedApp(app);
    setCurrentView("querySelection");
    console.log("currentView set to querySelection");
  };

  const handleBackToApps = () => {
    setCurrentView("apps");
    setSelectedApp(null);
    setEditingQueryId(undefined);
  };

  const handleCreateNewQuery = () => {
    setEditingQueryId(undefined);
    setCurrentView("queryGenerator");
  };

  const handleEditQuery = (queryId: string) => {
    setEditingQueryId(queryId);
    setCurrentView("queryGenerator");
  };

  const handleBackToQuerySelection = () => {
    setCurrentView("querySelection");
    setEditingQueryId(undefined);
  };

  // Render different views based on currentView
  console.log("Current state:", {
    currentView,
    selectedApp: selectedApp?.name,
    editingQueryId,
  });

  if (currentView === "querySelection" && selectedApp) {
    console.log("Rendering QuerySelectionPage");
    return (
      <QuerySelectionPage
        auth={auth}
        app={selectedApp}
        onBack={handleBackToApps}
        onCreateNew={handleCreateNewQuery}
        onEditQuery={handleEditQuery}
        onLogout={onLogout}
      />
    );
  }

  if (currentView === "queryGenerator" && selectedApp) {
    console.log("Rendering QueryGeneratorPage");
    return (
      <QueryGeneratorPage
        auth={auth}
        app={selectedApp}
        onBack={handleBackToQuerySelection}
        onBackToAppList={handleBackToApps}
        editingQueryId={editingQueryId}
        onLogout={onLogout}
      />
    );
  }

  console.log("Rendering default AppManagementPage");

  return (
    <div className="bg-background min-h-screen">
      {/* ヘッダー */}
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                  <Grid3X3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-foreground text-xl font-bold">
                    Kintone Query Creator
                  </h1>
                  <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                    <span className="text-foreground/80 font-medium">
                      {auth.subdomain}.cybozu.com
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="bg-muted/50 rounded-md px-2 py-0.5 font-mono text-xs">
                      {apps.length} アプリ
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* エラー表示 */}
        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-6 shadow-sm dark:border-red-800 dark:from-red-950/20 dark:to-orange-950/20">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-slate-500 to-slate-600">
                <span className="text-sm font-bold text-white">!</span>
              </div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                エラーが発生しました
              </h3>
            </div>
            <p className="mb-4 leading-relaxed text-red-700 dark:text-red-300">
              {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-600 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/20"
            >
              再読み込み
            </Button>
          </div>
        )}

        {/* ローディング */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-slate-500 to-slate-600">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
                <div className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-r from-slate-500 to-slate-600 opacity-30 blur-lg"></div>
              </div>
              <div className="text-center">
                <p className="text-foreground text-lg font-medium">
                  アプリを読み込み中...
                </p>
                <p className="text-muted-foreground text-sm">
                  Kintoneからアプリ情報を取得しています
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* フィルター・検索エリア */}
            <div className="mb-8 space-y-6">
              {/* 検索とフィルター */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    placeholder="アプリ名、作成者、更新者で検索..."
                    value={filter.searchTerm}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        searchTerm: e.target.value,
                      }))
                    }
                    className="bg-background/50 border-border/60 hover:border-border focus:bg-background h-11 pl-10 transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) =>
                      value && setViewMode(value as "grid" | "table")
                    }
                    className="bg-muted border-border/60 rounded-lg border p-1"
                  >
                    <ToggleGroupItem
                      value="grid"
                      aria-label="グリッド表示"
                      className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="table"
                      aria-label="テーブル表示"
                      className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                    >
                      <Table2 className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilter((prev) => ({
                        ...prev,
                        showFavoritesOnly: !prev.showFavoritesOnly,
                      }))
                    }
                    className={`h-11 whitespace-nowrap transition-all duration-200 ${
                      filter.showFavoritesOnly
                        ? "border-slate-600 text-slate-700 dark:text-slate-300"
                        : "border-border/60 hover:bg-muted/60 hover:border-border text-foreground"
                    }`}
                  >
                    <Star
                      className={`mr-2 h-4 w-4 ${filter.showFavoritesOnly ? "fill-current text-slate-700 dark:text-slate-300" : "text-foreground"}`}
                    />
                    ブックマーク
                  </Button>
                </div>
              </div>

              {/* 検索結果の説明 */}
              {(filter.searchTerm || filter.showFavoritesOnly) && (
                <div className="text-muted-foreground bg-muted/30 border-border/40 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
                  <Search className="h-4 w-4" />
                  <span>
                    {filter.searchTerm && (
                      <>
                        「
                        <span className="font-medium">{filter.searchTerm}</span>
                        」で検索中
                      </>
                    )}
                    {filter.searchTerm && filter.showFavoritesOnly && " • "}
                    {filter.showFavoritesOnly && "ブックマーク済みのみ表示"}
                    {" • "}
                    <span className="text-foreground font-medium">
                      {filteredApps.length}件
                    </span>
                    のアプリが見つかりました
                  </span>
                </div>
              )}
            </div>

            {/* アプリ一覧 */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredApps.map((app) => (
                  <Card
                    key={app.appId}
                    className="group border-border/60 hover:border-border bg-card/50 hover:bg-card relative flex h-full flex-col overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-black/5"
                  >
                    {/* カード背景のグラデーション効果 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-slate-600/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <CardHeader className="relative z-10 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <CardTitle className="text-foreground group-hover:text-foreground/90 truncate text-lg font-semibold transition-colors">
                            {app.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="bg-muted/60 hover:bg-muted font-mono text-xs transition-colors"
                            >
                              ID: {app.appId}
                            </Badge>
                            {app.code && (
                              <Badge
                                variant="outline"
                                className="border-border/60 h-5 px-2 py-0 text-xs"
                              >
                                {app.code}
                              </Badge>
                            )}
                            {(() => {
                              const queryCount = getQueryCount(app.appId);
                              return (
                                queryCount > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-slate-300 bg-slate-50 px-2 py-0 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300"
                                  >
                                    <Save className="mr-1 h-3 w-3" />
                                    {queryCount}
                                  </Badge>
                                )
                              );
                            })()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(app.appId)}
                          className="group/star h-8 w-8 flex-shrink-0 p-0 transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                        >
                          {app.isFavorite ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <Star className="text-muted-foreground h-4 w-4 transition-colors group-hover/star:text-yellow-400" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="relative z-10 flex flex-1 flex-col">
                      <CardDescription className="mb-4 flex-1 text-sm leading-relaxed">
                        {app.description ? (
                          cleanAndTruncateText(app.description, 100)
                        ) : (
                          <span className="text-muted-foreground/60 italic">
                            アプリの説明はありません
                          </span>
                        )}
                      </CardDescription>

                      {/* メタ情報 */}
                      <div className="mb-6 space-y-2">
                        {app.creator?.name && (
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <User className="h-3 w-3" />
                            <span className="truncate">
                              作成者: {app.creator.name}
                            </span>
                          </div>
                        )}
                        {app.modifiedAt && (
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span>
                              更新:{" "}
                              {new Date(app.modifiedAt).toLocaleDateString(
                                "ja-JP",
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div className="mt-auto flex gap-2">
                        <Button
                          onClick={() => handleAppSelect(app)}
                          className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg"
                          size="sm"
                        >
                          <Code2 className="mr-2 h-4 w-4" />
                          クエリ生成
                        </Button>
                        <Dialog
                          onOpenChange={(open: boolean) => {
                            if (!open) {
                              setSelectedAppInfo(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border/60 hover:bg-muted/60 hover:border-border px-3 transition-colors"
                              onClick={() => fetchAppInfo(app.appId)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
                            <DialogHeader className="pb-4">
                              <DialogTitle className="flex items-center gap-3 text-xl">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                                  <Info className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="text-foreground text-lg font-bold">
                                    アプリ詳細情報
                                  </div>
                                </div>
                              </DialogTitle>
                              <DialogDescription className="text-base">
                                {app.name} の詳細情報を表示しています
                              </DialogDescription>
                            </DialogHeader>

                            <div className="scrollbar-thin max-h-[60vh] overflow-y-auto pr-2">
                              {appInfoLoading ? (
                                <div className="flex items-center justify-center py-12">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  <span className="ml-2">読み込み中...</span>
                                </div>
                              ) : selectedAppInfo ? (
                                <div className="space-y-6">
                                  {/* 基本情報セクション */}
                                  <div className="space-y-4">
                                    <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                      基本情報
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <label className="text-muted-foreground text-sm font-medium">
                                          アプリ名
                                        </label>
                                        <div className="rounded-md border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-3 dark:border-slate-800 dark:from-slate-950/20 dark:to-slate-900/20">
                                          <p className="text-sm font-medium">
                                            {selectedAppInfo.name}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-muted-foreground text-sm font-medium">
                                          アプリID
                                        </label>
                                        <div className="bg-muted/30 rounded-md border p-3">
                                          <p className="font-mono text-sm font-medium">
                                            {selectedAppInfo.appId}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-muted-foreground text-sm font-medium">
                                        アプリコード
                                      </label>
                                      <div className="bg-muted/30 rounded-md border p-3">
                                        <p className="font-mono text-sm">
                                          {selectedAppInfo.code || (
                                            <span className="text-muted-foreground italic">
                                              未設定
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 説明セクション */}
                                  <div className="space-y-4">
                                    <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                      説明
                                    </h3>
                                    <div className="min-h-[100px] rounded-md border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4 text-sm dark:border-slate-800 dark:from-slate-950/20 dark:to-slate-900/20">
                                      {selectedAppInfo.description ? (
                                        <p className="leading-relaxed whitespace-pre-wrap">
                                          {cleanAndTruncateText(
                                            selectedAppInfo.description,
                                            500,
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-muted-foreground py-4 text-center italic">
                                          説明が設定されていません
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* 作成・更新情報セクション */}
                                  <div className="space-y-4">
                                    <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                      作成・更新情報
                                    </h3>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                      {/* 作成情報 */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-green-600" />
                                          <label className="text-muted-foreground text-sm font-medium">
                                            作成者
                                          </label>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950/20 dark:to-slate-900/20">
                                          <p className="text-sm font-medium">
                                            {(selectedAppInfo.creator?.name &&
                                              selectedAppInfo.creator.name.trim()) ||
                                              "-"}
                                          </p>
                                          {selectedAppInfo.creator?.code &&
                                            selectedAppInfo.creator.code.trim() && (
                                              <p className="text-muted-foreground mt-1 text-xs">
                                                ID:{" "}
                                                {selectedAppInfo.creator.code}
                                              </p>
                                            )}
                                          <div className="mt-3 flex items-center gap-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                                            <Calendar className="text-muted-foreground h-3 w-3" />
                                            <p className="text-muted-foreground text-xs">
                                              {selectedAppInfo.createdAt
                                                ? new Date(
                                                    selectedAppInfo.createdAt,
                                                  ).toLocaleString("ja-JP")
                                                : "-"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 更新情報 */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-blue-600" />
                                          <label className="text-muted-foreground text-sm font-medium">
                                            最終更新者
                                          </label>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950/20 dark:to-slate-900/20">
                                          <p className="text-sm font-medium">
                                            {(selectedAppInfo.modifier?.name &&
                                              selectedAppInfo.modifier.name.trim()) ||
                                              "-"}
                                          </p>
                                          {selectedAppInfo.modifier?.code &&
                                            selectedAppInfo.modifier.code.trim() && (
                                              <p className="text-muted-foreground mt-1 text-xs">
                                                ID:{" "}
                                                {selectedAppInfo.modifier.code}
                                              </p>
                                            )}
                                          <div className="mt-3 flex items-center gap-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                                            <Calendar className="text-muted-foreground h-3 w-3" />
                                            <p className="text-muted-foreground text-xs">
                                              {selectedAppInfo.modifiedAt
                                                ? new Date(
                                                    selectedAppInfo.modifiedAt,
                                                  ).toLocaleString("ja-JP")
                                                : "-"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <AppDataTable
                apps={filteredApps}
                auth={auth}
                onSelectApp={handleAppSelect}
                onToggleFavorite={toggleFavorite}
              />
            )}

            {filteredApps.length === 0 && !loading && viewMode === "grid" && (
              <div className="py-20 text-center">
                <div className="flex flex-col items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900/20 dark:to-slate-800/20">
                    <Search className="h-8 w-8 text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-foreground text-xl font-semibold">
                      {filter.searchTerm || filter.showFavoritesOnly
                        ? "アプリが見つかりません"
                        : "アプリがありません"}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {filter.searchTerm || filter.showFavoritesOnly
                        ? "検索条件を変更して再度お試しください。または、新しいアプリの作成をご検討ください。"
                        : "まだアプリが作成されていません。Kintoneでアプリを作成してから再度アクセスしてください。"}
                    </p>
                  </div>
                  {(filter.searchTerm || filter.showFavoritesOnly) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setFilter({
                          searchTerm: "",
                          showFavoritesOnly: false,
                          appId: "",
                          appName: "",
                          appCode: "",
                          creator: "",
                          updatedDate: "",
                        })
                      }
                      className="mt-4"
                    >
                      フィルターをクリア
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
