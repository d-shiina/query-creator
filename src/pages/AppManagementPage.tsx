import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import AppHeader from "@/components/template/AppHeader";
import AppTable, { AppTableHandle } from "@/components/AppTable";
import { ShortcutBar } from "@/components/table-parts";
import Coachmarks from "@/components/Coachmarks";
import AppDetailDialog from "@/components/AppDetailDialog";
import QuerySelectionPage from "./QuerySelectionPage";
import QueryGeneratorPage from "./QueryGeneratorPage";
import { KintoneApp, AppFilter, KintoneAuth } from "@/types/kintone";
import { AlertCircle, HelpCircle, Pin, Search, X } from "lucide-react";
// ピン留めの保存先は従来のブックマーク（favorites）と同じキー。
// 呼び名を変えただけで、利用者が付けた印はそのまま引き継ぐ
import {
  addToFavorites,
  removeFromFavorites,
  isAppFavorite,
} from "@/utils/favorites";
import { getRecentAppIds, recordAppOpened } from "@/utils/recent-apps";
import { TOUR_APP_LIST, hasSeenTour, markTourSeen } from "@/utils/onboarding";
import { getQueryCount } from "@/hooks/useQueryGenerator";
import { cn } from "@/utils/tailwind";

/**
 * アプリ一覧。
 *
 * 表示形式はテーブルの1本に絞っている。アプリにはアイコンもサムネイルも
 * ないためカードにしても手掛かりが増えず、一度に見える件数と
 * 並べ替えのぶんだけ表が有利だったため。
 *
 * 画面はヘッダー・ツールバー・表の3段で固定し、スクロールするのは行だけ。
 * 検索とアプリ数はスクロール位置に関わらず常に見えている。
 */

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
  const [queryCounts, setQueryCounts] = useState<Record<string, number>>({});
  const [detailApp, setDetailApp] = useState<KintoneApp | null>(null);
  const [recentAppIds, setRecentAppIds] = useState<string[]>(() =>
    getRecentAppIds(),
  );
  const [currentView, setCurrentView] = useState<
    "apps" | "querySelection" | "queryGenerator"
  >("apps");
  const [selectedApp, setSelectedApp] = useState<KintoneApp | null>(null);
  const [editingQueryId, setEditingQueryId] = useState<string | undefined>(
    undefined,
  );
  const [filter, setFilter] = useState<AppFilter>({
    searchTerm: "",
    showPinnedOnly: false,
  });
  const [tourOpen, setTourOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<AppTableHandle>(null);

  // アプリ一覧を取得（100件ずつ、なくなるまで）
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        setError("");

        const allApps: KintoneApp[] = [];
        const limit = 100;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const result = await window.kintoneAPI.getApps(auth, {
            offset,
            limit,
          });

          if (!result.success || !result.data?.apps) {
            setError(result.error || "アプリの取得に失敗しました");
            break;
          }

          allApps.push(...result.data.apps);

          // 取得件数がlimitに満たなければ、そこで打ち止め
          hasMore = result.data.apps.length === limit;
          offset += limit;
        }

        setApps(
          allApps.map((app) => ({
            ...app,
            isPinned: isAppFavorite(app.appId),
          })),
        );
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

  // 保存済みクエリ数はlocalStorageにあるので、行ごとに読まずまとめて数える
  const refreshQueryCounts = useCallback(() => {
    setQueryCounts(
      Object.fromEntries(
        apps.map((app) => [app.appId, getQueryCount(app.appId)]),
      ),
    );
  }, [apps]);

  useEffect(() => {
    refreshQueryCounts();

    // 別ウィンドウでの変更（storage）と、同一ウィンドウでの保存（独自イベント）の両方を拾う
    window.addEventListener("storage", refreshQueryCounts);
    window.addEventListener("localStorageUpdate", refreshQueryCounts);
    return () => {
      window.removeEventListener("storage", refreshQueryCounts);
      window.removeEventListener("localStorageUpdate", refreshQueryCounts);
    };
  }, [refreshQueryCounts]);

  /*
   * キーボードだけで「絞る → 選ぶ → 開く」まで行けるようにする。
   *   起動直後: 検索欄にフォーカス（打てばすぐ絞れる）
   *   ↓       : 検索欄からでも、どこも掴んでいない状態からでも一覧へ入る
   *   /       : どこからでも検索欄へ戻る
   * 一覧に入ったあとの ↑↓ / Enter / Space は AppTable 側が持つ。
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const inTextField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (event.key === "/" && !inTextField) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // どこもフォーカスしていない状態（背景をクリックした後など）からも一覧へ
      if (event.key === "ArrowDown" && target === document.body) {
        event.preventDefault();
        tableRef.current?.focusRow(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 開いて最初にすることは絞り込みなので、検索欄から始める
  useEffect(() => {
    if (!loading) searchRef.current?.focus();
  }, [loading]);

  // 初回だけ、見つけにくい操作を指しておく（画面は止めない）
  useEffect(() => {
    if (loading || hasSeenTour(TOUR_APP_LIST)) return;
    setTourOpen(true);
  }, [loading]);

  const closeTour = () => {
    markTourSeen(TOUR_APP_LIST);
    setTourOpen(false);
  };

  const togglePin = (appId: string) => {
    const app = apps.find((a) => a.appId === appId);
    if (!app) return;

    if (app.isPinned) {
      removeFromFavorites(appId);
    } else {
      addToFavorites(appId);
    }

    setApps((prevApps) =>
      prevApps.map((prev) =>
        prev.appId === appId ? { ...prev, isPinned: !prev.isPinned } : prev,
      ),
    );
  };

  const filteredApps = useMemo(() => {
    const term = filter.searchTerm.trim().toLowerCase();

    return apps.filter((app) => {
      if (filter.showPinnedOnly && !app.isPinned) return false;
      if (!term) return true;

      // 名前で当たらないときの受け皿として、ID・コード・説明・担当者も見る
      return [
        app.name,
        app.appId,
        app.code,
        app.description,
        app.creator?.name,
        app.creator?.code,
        app.modifier?.name,
        app.modifier?.code,
      ].some((value) => value?.toLowerCase().includes(term));
    });
  }, [apps, filter]);

  const isFiltered = !!filter.searchTerm.trim() || filter.showPinnedOnly;

  // Navigation handlers
  const handleAppSelect = (app: KintoneApp) => {
    // 開いた記録が「最近使った」の並びになる
    setRecentAppIds(recordAppOpened(app.appId));
    setDetailApp(null);
    setSelectedApp(app);
    setCurrentView("querySelection");
    onSelectApp(app);
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

  if (currentView === "querySelection" && selectedApp) {
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

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <AppHeader
        breadcrumb={[{ label: "アプリ一覧" }]}
        meta={
          <span className="text-muted-foreground shrink-0 px-1 text-xs">
            {auth.subdomain}.cybozu.com
          </span>
        }
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setTourOpen(true)}
            aria-label="使い方を見る"
            title="使い方を見る"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
        }
        onLogout={onLogout}
      />

      {/* ツールバー：スクロールしても検索と件数は消えない */}
      <div className="border-border bg-card flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <div data-tour="search" className="relative max-w-md min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            ref={searchRef}
            value={filter.searchTerm}
            onChange={(event) =>
              setFilter((prev) => ({ ...prev, searchTerm: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setFilter((prev) => ({ ...prev, searchTerm: "" }));
                event.currentTarget.blur();
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                tableRef.current?.focusRow(0);
                return;
              }
              // 候補が1件に絞れているなら、そのままEnterで開く
              if (event.key === "Enter" && filteredApps.length > 0) {
                event.preventDefault();
                if (filteredApps.length === 1) {
                  handleAppSelect(filteredApps[0]);
                } else {
                  tableRef.current?.focusRow(0);
                }
              }
            }}
            placeholder="アプリ名、ID、コード、担当者で絞り込む"
            aria-label="アプリを絞り込む"
            className="h-8 pr-16 pl-8 text-sm"
          />
          {filter.searchTerm ? (
            <button
              type="button"
              onClick={() => {
                setFilter((prev) => ({ ...prev, searchTerm: "" }));
                searchRef.current?.focus();
              }}
              aria-label="検索条件を消す"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="border-border text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none">
              /
            </kbd>
          )}
        </div>

        <Button
          data-tour="pin"
          variant="ghost"
          size="sm"
          onClick={() =>
            setFilter((prev) => ({
              ...prev,
              showPinnedOnly: !prev.showPinnedOnly,
            }))
          }
          aria-pressed={filter.showPinnedOnly}
          className={cn(
            "h-8",
            filter.showPinnedOnly && "bg-accent text-accent-foreground",
          )}
        >
          <Pin
            className={cn(
              "h-3.5 w-3.5",
              filter.showPinnedOnly && "fill-primary text-primary",
            )}
          />
          ピン留め
        </Button>

        <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
          {isFiltered ? (
            <>
              <span className="text-foreground font-medium">
                {filteredApps.length}
              </span>
              {` / ${apps.length} 件`}
            </>
          ) : (
            `${apps.length} 件`
          )}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex shrink-0 items-center gap-2 border-b px-4 py-2 text-sm"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </Button>
        </div>
      )}

      {/*
        一覧：行だけがスクロールし、見出しは貼り付いたまま。
        この画面は一覧そのものがページなので、枠で囲わず窓いっぱいに置く。
        帯の区切りは罫線だけで足り、行のハイライトも端まで伸びる。
      */}
      <div
        data-tour="list"
        className="bg-card scrollbar-thin min-h-0 flex-1 overflow-auto"
      >
        {loading ? (
          <TableSkeleton />
        ) : filteredApps.length > 0 ? (
          <AppTable
            ref={tableRef}
            apps={filteredApps}
            queryCounts={queryCounts}
            recentAppIds={recentAppIds}
            onSelectApp={handleAppSelect}
            onTogglePin={togglePin}
            onShowDetail={setDetailApp}
          />
        ) : (
          <EmptyState
            isFiltered={isFiltered}
            onClear={() => setFilter({ searchTerm: "", showPinnedOnly: false })}
          />
        )}
      </div>

      <ShortcutBar
        hints={[
          { keys: "/", label: "検索" },
          { keys: "↓", label: "一覧へ" },
          { keys: "↑↓", label: "行を移動" },
          { keys: "Enter", label: "開く" },
          { keys: "Space", label: "詳細" },
        ]}
      />

      <Coachmarks
        open={tourOpen}
        onClose={closeTour}
        steps={[
          {
            target: "list",
            title: "アプリを選ぶ",
            body: "クエリを作る kintone アプリの行をクリックすると、そのアプリの保存済みクエリ一覧に進みます。行の右端の ⓘ では、レコード件数や作成者などの詳細を確認できます。",
          },
          {
            target: "search",
            title: "アプリを探す",
            body: "アプリ名・ID・コード・担当者で絞り込めます。",
          },
          {
            target: "pin",
            title: "よく使うアプリを先頭に",
            body: "行の左端にカーソルを合わせるとピンが表示されます。ピン留めしたアプリは一覧の先頭に並びます。最近開いたアプリは自動で上位に表示されます。",
          },
        ]}
      />

      <AppDetailDialog
        app={detailApp}
        auth={auth}
        onClose={() => setDetailApp(null)}
        onSelectApp={handleAppSelect}
      />
    </div>
  );
}

/** 読み込み中も行の高さと列位置を保って、表示が切り替わるときに飛ばない */
function TableSkeleton() {
  return (
    <div aria-busy="true" aria-label="アプリを読み込み中">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="border-border/60 flex h-11 items-center gap-4 border-b px-4"
        >
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton
            className="h-4 min-w-0 flex-1"
            style={{ maxWidth: `${40 + ((index * 7) % 35)}%` }}
          />
          <Skeleton className="h-3 w-12 shrink-0" />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  isFiltered,
  onClear,
}: {
  isFiltered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <Search className="text-muted-foreground/40 h-6 w-6" />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {isFiltered
            ? "条件に一致するアプリがありません"
            : "表示できるアプリがありません"}
        </p>
        <p className="text-muted-foreground text-xs">
          {isFiltered
            ? "検索語を短くするか、ピン留めの絞り込みを外してください。"
            : "kintoneでアプリを作成すると、ここに表示されます。"}
        </p>
      </div>
      {isFiltered && (
        <Button variant="outline" size="sm" onClick={onClear}>
          絞り込みを解除
        </Button>
      )}
    </div>
  );
}
