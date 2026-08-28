import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pin, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppHeader from "@/components/template/AppHeader";
import QueryTable, { QueryTableHandle } from "@/components/QueryTable";
import { ShortcutBar } from "@/components/table-parts";

import { SavedQuery, useQueryGenerator } from "@/hooks/useQueryGenerator";
import { KintoneAuth, KintoneApp, QueryCondition } from "@/types/kintone";
// ピン留めの保存先は従来のお気に入り（favorites）と同じキー
import {
  addQueryToFavorites,
  getFavoriteQueries,
  removeQueryFromFavorites,
  isQueryFavorite,
} from "@/utils/favorites";

/**
 * 保存済みクエリの一覧。
 *
 * アプリ一覧と同じ骨格（ヘッダー・ツールバー・表・キー操作の手引き）で組む。
 * 表は枠で囲わず窓いっぱいに置き、スクロールするのは行だけ。
 */

/** 古い保存データには generatedQuery が無いので、条件から組み直す */
const generateQueryFromConditions = (
  conditions: QueryCondition[],
  orderBy: string,
) => {
  if (!conditions || conditions.length === 0) {
    return orderBy && orderBy !== "none" ? `order by ${orderBy}` : "";
  }

  const conditionStrings = conditions.map((condition) => {
    const { field, operator, value } = condition;
    if (operator === "is" || operator === "is not") {
      // kintoneの空判定は `is empty` / `is not empty`
      return `${field} ${operator} empty`;
    }
    if (operator === "in" || operator === "not in") {
      const values = Array.isArray(value) ? value : [value];
      const valueStr = values.map((v) => `"${v}"`).join(", ");
      return `${field} ${operator} (${valueStr})`;
    }
    if (operator === "like" || operator === "not like") {
      return `${field} ${operator} "%${value}%"`;
    }
    return `${field} ${operator} "${value}"`;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<SavedQuery[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pinnedVersion, setPinnedVersion] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<QueryTableHandle>(null);

  const { savedQueries, deleteQuery } = useQueryGenerator(app.appId);

  // 発行されるクエリ文字列まで含めて一覧に渡す
  const queries = useMemo(
    () =>
      (savedQueries ?? []).map((query) => ({
        ...query,
        generatedQuery:
          query.generatedQuery ||
          generateQueryFromConditions(query.conditions, query.orderBy),
      })),
    [savedQueries],
  );

  const pinnedIds = useMemo(() => {
    void pinnedVersion; // ピンを付け外ししたら数え直す
    return new Set(
      getFavoriteQueries()
        .filter((favorite) => favorite.appId === app.appId)
        .map((favorite) => favorite.queryId),
    );
  }, [app.appId, pinnedVersion]);

  const filteredQueries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return queries.filter((query) => {
      if (showPinnedOnly && !pinnedIds.has(query.id)) return false;
      if (!term) return true;

      // 名前で当たらないときのために、メモとクエリ本文も見る
      return [query.name, query.memo, query.generatedQuery].some((value) =>
        value?.toLowerCase().includes(term),
      );
    });
  }, [queries, searchTerm, showPinnedOnly, pinnedIds]);

  const isFiltered = !!searchTerm.trim() || showPinnedOnly;
  const selectedQueries = queries.filter((query) => selectedIds.has(query.id));

  /*
   * Escapeでアプリ一覧へ戻る。ダイアログやポップオーバーが開いている間は
   * Radix側のEscape（閉じる）を優先し、IME変換中は反応しない。
   * 検索欄で文字を消すEscapeも、消す側がpreventDefaultするのでここには来ない。
   */
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
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  // 「/」で検索へ、どこも掴んでいないところからの「↓」で一覧へ
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
    searchRef.current?.focus();
  }, []);

  const togglePin = (queryId: string) => {
    if (isQueryFavorite(queryId)) {
      removeQueryFromFavorites(queryId);
    } else {
      addQueryToFavorites(queryId, app.appId);
    }
    setPinnedVersion((prev) => prev + 1);
  };

  const toggleSelect = (queryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(queryId)) {
        next.delete(queryId);
      } else {
        next.add(queryId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === filteredQueries.length
        ? new Set()
        : new Set(filteredQueries.map((query) => query.id)),
    );
  };

  const confirmDelete = async () => {
    if (!deleteTargets) return;

    setIsDeleting(true);
    try {
      for (const query of deleteTargets) {
        await deleteQuery(query.id);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteTargets.forEach((query) => next.delete(query.id));
        return next;
      });
    } finally {
      setIsDeleting(false);
      setDeleteTargets(null);
    }
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <AppHeader
        onBack={onBack}
        backLabel="アプリ一覧に戻る"
        breadcrumb={[
          { label: "アプリ一覧", onClick: onBack },
          { label: app.name, truncate: true },
          { label: "クエリ" },
        ]}
        meta={
          <span className="text-muted-foreground shrink-0 px-1 text-xs">
            ID: {app.appId}
          </span>
        }
        onLogout={onLogout}
      />

      {/* ツールバー：スクロールしても検索と新規作成は消えない */}
      <div className="border-border bg-card flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <div className="relative max-w-md min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            ref={searchRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && searchTerm) {
                // 文字が残っているうちは、Escapeは消すためのキー（戻るは次のEscape）
                event.preventDefault();
                setSearchTerm("");
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                tableRef.current?.focusRow(0);
                return;
              }
              if (event.key === "Enter" && filteredQueries.length > 0) {
                event.preventDefault();
                if (filteredQueries.length === 1) {
                  onEditQuery(filteredQueries[0].id);
                } else {
                  tableRef.current?.focusRow(0);
                }
              }
            }}
            placeholder="クエリ名、メモ、クエリ本文で絞り込む"
            aria-label="クエリを絞り込む"
            className="h-8 pr-16 pl-8 text-sm"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
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
          variant="ghost"
          size="sm"
          onClick={() => setShowPinnedOnly((prev) => !prev)}
          aria-pressed={showPinnedOnly}
          className={`h-8 ${showPinnedOnly ? "bg-accent text-accent-foreground" : ""}`}
        >
          <Pin
            className={`h-3.5 w-3.5 ${showPinnedOnly ? "fill-primary text-primary" : ""}`}
          />
          ピン留め
        </Button>

        {selectedQueries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTargets(selectedQueries)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {selectedQueries.length}件を削除
          </Button>
        )}

        <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
          {isFiltered ? (
            <>
              <span className="text-foreground font-medium">
                {filteredQueries.length}
              </span>
              {` / ${queries.length} 件`}
            </>
          ) : (
            `${queries.length} 件`
          )}
        </span>

        <Button size="sm" className="h-8" onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5" />
          新規クエリ
        </Button>
      </div>

      {/* 一覧：行だけがスクロールし、見出しは貼り付いたまま */}
      <div className="bg-card scrollbar-thin min-h-0 flex-1 overflow-auto">
        {filteredQueries.length > 0 ? (
          <QueryTable
            ref={tableRef}
            queries={filteredQueries}
            pinnedIds={pinnedIds}
            selectedIds={selectedIds}
            onEditQuery={(query) => onEditQuery(query.id)}
            onTogglePin={togglePin}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onDeleteQuery={(query) => setDeleteTargets([query])}
          />
        ) : (
          <EmptyState
            isFiltered={isFiltered}
            onClear={() => {
              setSearchTerm("");
              setShowPinnedOnly(false);
            }}
            onCreateNew={onCreateNew}
          />
        )}
      </div>

      <ShortcutBar
        hints={[
          { keys: "/", label: "検索" },
          { keys: "↓", label: "一覧へ" },
          { keys: "↑↓", label: "行を移動" },
          { keys: "Enter", label: "編集" },
          { keys: "Space", label: "選択" },
          { keys: "Delete", label: "削除" },
          { keys: "Esc", label: "アプリ一覧へ" },
        ]}
      />

      <Dialog
        open={!!deleteTargets}
        onOpenChange={(open) => !open && setDeleteTargets(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">クエリを削除</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                {deleteTargets?.length === 1 ? (
                  <p>
                    「
                    <span className="text-foreground font-medium">
                      {deleteTargets[0].name}
                    </span>
                    」を削除します。
                  </p>
                ) : (
                  <p>
                    選択した
                    <span className="text-foreground font-medium">
                      {deleteTargets?.length}件
                    </span>
                    を削除します。
                  </p>
                )}
                <p>取り消せません。</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTargets(null)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  isFiltered,
  onClear,
  onCreateNew,
}: {
  isFiltered: boolean;
  onClear: () => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <Search className="text-muted-foreground/40 h-6 w-6" />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {isFiltered
            ? "条件に一致するクエリがありません"
            : "保存されたクエリがありません"}
        </p>
        <p className="text-muted-foreground text-xs">
          {isFiltered
            ? "検索語を短くするか、ピン留めの絞り込みを外してください。"
            : "クエリを保存すると、ここに表示されます。"}
        </p>
      </div>
      {isFiltered ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          絞り込みを解除
        </Button>
      ) : (
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5" />
          新規クエリ
        </Button>
      )}
    </div>
  );
}
