import React, { useMemo, useRef, useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Info,
  Star,
} from "lucide-react";
import { KintoneApp } from "@/types/kintone";
import { cleanAndTruncateText } from "@/utils/text";
import {
  formatAbsoluteDateTime,
  formatRelativeDate,
} from "@/utils/date-display";
import { cn } from "@/utils/tailwind";

/**
 * アプリ一覧の本体。
 *
 * この画面ですることは「目的のアプリを見つけて開く」だけなので、
 * 行は1行1アプリの高さに揃えて、一度に見える件数を優先する。
 * 作成者・スペース・作成日時など選ぶ判断に使わない情報は列に出さず、
 * 詳細ダイアログに寄せている。
 *
 * ブックマークは並び順に関係なく常に先頭へ集める。★を付ける動機が
 * 「毎回ここから開く」である以上、探さずに済むほうが正しい。
 */

type SortField = "name" | "appId" | "queryCount" | "modifiedAt";
type SortOrder = "asc" | "desc";

interface AppTableProps {
  apps: KintoneApp[];
  /** appId -> 保存済みクエリ数 */
  queryCounts: Record<string, number>;
  onSelectApp: (app: KintoneApp) => void;
  onToggleFavorite: (appId: string) => void;
  onShowDetail: (app: KintoneApp) => void;
}

const COLUMNS: {
  field: SortField;
  label: string;
  className: string;
  align?: "right";
  /** 幅が足りないときに落とす列 */
  hideBelow?: string;
}[] = [
  { field: "name", label: "アプリ名", className: "min-w-0" },
  { field: "appId", label: "ID", className: "w-20" },
  { field: "queryCount", label: "クエリ", className: "w-16", align: "right" },
  { field: "modifiedAt", label: "更新", className: "w-28" },
];

export default function AppTable({
  apps,
  queryCounts,
  onSelectApp,
  onToggleFavorite,
  onShowDetail,
}: AppTableProps) {
  const [sortField, setSortField] = useState<SortField>("modifiedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const sortedApps = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;

    const value = (app: KintoneApp): string | number => {
      switch (sortField) {
        case "name":
          return app.name.toLowerCase();
        case "appId":
          return Number(app.appId) || 0;
        case "queryCount":
          return queryCounts[app.appId] || 0;
        case "modifiedAt":
          return new Date(app.modifiedAt || 0).getTime() || 0;
      }
    };

    return [...apps].sort((a, b) => {
      // ブックマークは並び順より優先して先頭へ
      if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;

      const aValue = value(a);
      const bValue = value(b);
      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      // 同着はIDで固定して、再描画のたびに行が入れ替わらないようにする
      return Number(a.appId) - Number(b.appId);
    });
  }, [apps, queryCounts, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(field);
    // 名前は昇順、数と日付は「多い・新しい」から見たい
    setSortOrder(field === "name" || field === "appId" ? "asc" : "desc");
  };

  /** ↑↓で行を移動し、Enterで開く。マウスに持ち替えずに一覧を送れるようにする */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    // 行の中のボタン（★や詳細）を操作しているときは行のキー操作を出さない
    if (event.target !== event.currentTarget) return;

    const move = (next: number) => {
      event.preventDefault();
      const clamped = Math.max(0, Math.min(next, sortedApps.length - 1));
      rowRefs.current[clamped]?.focus();
    };

    switch (event.key) {
      case "ArrowDown":
        return move(index + 1);
      case "ArrowUp":
        return move(index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(sortedApps.length - 1);
      case "Enter":
        event.preventDefault();
        return onSelectApp(sortedApps[index]);
      case " ":
        event.preventDefault();
        return onShowDetail(sortedApps[index]);
    }
  };

  if (sortedApps.length === 0) {
    return null;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-card sticky top-0 z-10">
        <tr className="border-border border-b">
          <TableHead className="w-9" aria-label="ブックマーク" />
          {COLUMNS.map((column) => (
            <TableHead
              key={column.field}
              className={cn(
                column.className,
                column.align === "right" && "text-right",
              )}
              aria-sort={
                sortField === column.field
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <button
                type="button"
                onClick={() => handleSort(column.field)}
                className={cn(
                  "group hover:text-foreground inline-flex items-center gap-1 transition-colors",
                  column.align === "right" && "flex-row-reverse",
                  sortField === column.field && "text-foreground",
                )}
              >
                {column.label}
                <SortIcon
                  active={sortField === column.field}
                  order={sortOrder}
                />
              </button>
            </TableHead>
          ))}
          <TableHead className="w-16" aria-label="操作" />
        </tr>
      </thead>

      <TableBody>
        {sortedApps.map((app, index) => {
          const queryCount = queryCounts[app.appId] || 0;
          const relative = formatRelativeDate(app.modifiedAt);

          return (
            <TableRow
              key={app.appId}
              ref={(element) => {
                rowRefs.current[index] = element;
              }}
              tabIndex={0}
              onClick={() => onSelectApp(app)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="focus-visible:bg-muted/60 focus-visible:ring-ring/60 group cursor-pointer scroll-mt-10 outline-none focus-visible:ring-1 focus-visible:ring-inset"
            >
              <TableCell className="px-1 text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(app.appId);
                  }}
                  title={
                    app.isFavorite ? "ブックマークを外す" : "ブックマークする"
                  }
                  aria-pressed={!!app.isFavorite}
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      app.isFavorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40 group-hover:text-muted-foreground",
                    )}
                  />
                </Button>
              </TableCell>

              {/* 1行1アプリ。説明は名前の続きに薄く添え、行の高さは揃える */}
              <TableCell className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span
                    className="max-w-[26rem] shrink-0 truncate font-medium"
                    title={app.name}
                  >
                    {app.name}
                  </span>
                  {app.code && (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {app.code}
                    </span>
                  )}
                  {app.description && (
                    <span
                      className="text-muted-foreground/70 hidden min-w-0 flex-1 truncate text-xs lg:inline"
                      title={cleanAndTruncateText(app.description, 200)}
                    >
                      {cleanAndTruncateText(app.description, 120)}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                {app.appId}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {queryCount > 0 ? (
                  <span className="text-foreground">{queryCount}</span>
                ) : (
                  <span className="text-muted-foreground/40">-</span>
                )}
              </TableCell>

              <TableCell
                className="text-muted-foreground text-xs whitespace-nowrap"
                title={formatAbsoluteDateTime(app.modifiedAt) || undefined}
              >
                {relative || "-"}
              </TableCell>

              <TableCell className="pr-2 text-right">
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowDetail(app);
                    }}
                    title="詳細（レコード件数を取得）"
                    aria-label={`${app.name} の詳細`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight
                    aria-hidden="true"
                    className="text-muted-foreground/30 group-hover:text-muted-foreground h-4 w-4 shrink-0 transition-colors"
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </table>
  );
}

/** 並べ替え対象の列だけ向きを出す。それ以外はホバーしたときにだけ薄く示す */
function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) {
    return (
      <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
    );
  }
  return order === "asc" ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}
