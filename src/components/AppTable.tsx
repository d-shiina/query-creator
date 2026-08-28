import React, { useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { SectionRow, SortOrder, SortableHead } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { ChevronRight, Info, Pin } from "lucide-react";
import { KintoneApp } from "@/types/kintone";
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
 * 上には「ピン留め」を置く。利用者が明示した常用アプリなので、
 * 並べ替えを変えても先頭に留まる。
 */

type SortField = "name" | "appId" | "queryCount" | "modifiedAt";

/** 一覧の外（検索欄など）からキーボード操作を渡すための取っ手 */
export interface AppTableHandle {
  /** 指定した行へフォーカスを移す。省略すると先頭 */
  focusRow: (index?: number) => void;
}

interface AppTableProps {
  ref?: React.Ref<AppTableHandle>;
  apps: KintoneApp[];
  /** appId -> 保存済みクエリ数 */
  queryCounts: Record<string, number>;
  onSelectApp: (app: KintoneApp) => void;
  onTogglePin: (appId: string) => void;
  onShowDetail: (app: KintoneApp) => void;
}

/**
 * 幅は列ごとに固定する（table-fixed）。長さの読めない値があると、
 * 自動幅では列が押し出されて横スクロールになるため。
 * 余りは名前に渡す。説明は一覧には出さず、詳細ダイアログで読む。
 */
const COLUMNS: {
  /** 並べ替えできない列は field を持たない */
  field?: SortField;
  label: string;
  className: string;
  align?: "right";
}[] = [
  // 幅を持たない列が余りを受け取る
  { field: "name", label: "アプリ名", className: "" },
  { field: "appId", label: "ID", className: "w-20", align: "right" },
  { field: "queryCount", label: "クエリ", className: "w-16", align: "right" },
  { field: "modifiedAt", label: "更新", className: "w-24" },
];

export default function AppTable({
  ref,
  apps,
  queryCounts,
  onSelectApp,
  onTogglePin,
  onShowDetail,
}: AppTableProps) {
  const [sortField, setSortField] = useState<SortField>("modifiedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  /** Tabで入れる行はひとつだけ。何百行もタブ送りさせない（roving tabindex） */
  const [activeIndex, setActiveIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    // 省略時は最後に見ていた行。ダイアログを閉じたあとに戻す先として使う
    focusRow: (index = focusableIndex) => rowRefs.current[index]?.focus(),
  }));

  const sections = useMemo(() => {
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

    const bySort = (a: KintoneApp, b: KintoneApp) => {
      const aValue = value(a);
      const bValue = value(b);
      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      // 同着はIDで固定して、再描画のたびに行が入れ替わらないようにする
      return Number(a.appId) - Number(b.appId);
    };

    const pinned = apps.filter((app) => app.isPinned).sort(bySort);
    const rest = apps.filter((app) => !app.isPinned).sort(bySort);

    return [
      { key: "pinned", label: "ピン留め", apps: pinned },
      { key: "rest", label: "すべて", apps: rest },
    ].filter((section) => section.apps.length > 0);
  }, [apps, queryCounts, sortField, sortOrder]);

  /** キー操作のために、セクションをまたいだ通し番号で行を並べたもの */
  const flatApps = useMemo(
    () => sections.flatMap((section) => section.apps),
    [sections],
  );

  // 絞り込みで行が減ったときに、Tabで入れる行が消えたままにならないようにする
  const focusableIndex = Math.min(
    activeIndex,
    Math.max(flatApps.length - 1, 0),
  );

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
    // 行の中のボタン（ピンや詳細）を操作しているときは行のキー操作を出さない
    if (event.target !== event.currentTarget) return;

    const move = (next: number) => {
      event.preventDefault();
      const clamped = Math.max(0, Math.min(next, flatApps.length - 1));
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
        return move(flatApps.length - 1);
      case "Enter":
        event.preventDefault();
        return onSelectApp(flatApps[index]);
      case " ":
        event.preventDefault();
        return onShowDetail(flatApps[index]);
    }
  };

  if (flatApps.length === 0) {
    return null;
  }

  // 見出しは区切りとして意味があるときだけ出す
  const showSectionLabels = sections.length > 1;
  let rowIndex = -1;

  return (
    <table className="w-full table-fixed text-sm">
      <thead className="bg-card sticky top-0 z-10">
        <tr className="border-border border-b">
          <TableHead className="w-12" aria-label="ピン留め" />
          {COLUMNS.map((column) => (
            <SortableHead
              key={column.label}
              label={column.label}
              className={column.className}
              align={column.align}
              active={!!column.field && sortField === column.field}
              order={sortOrder}
              onSort={
                column.field ? () => handleSort(column.field!) : undefined
              }
            />
          ))}
          <TableHead className="w-16 pr-4" aria-label="操作" />
        </tr>
      </thead>

      {sections.map((section) => (
        <TableBody key={section.key}>
          {showSectionLabels && (
            <SectionRow
              label={section.label}
              count={section.apps.length}
              colSpan={COLUMNS.length + 2}
            />
          )}

          {section.apps.map((app) => {
            const queryCount = queryCounts[app.appId] || 0;
            const relative = formatRelativeDate(app.modifiedAt);
            rowIndex += 1;
            const index = rowIndex;

            return (
              <TableRow
                key={app.appId}
                ref={(element) => {
                  rowRefs.current[index] = element;
                }}
                tabIndex={index === focusableIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => onSelectApp(app)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="focus-visible:bg-accent focus-visible:ring-primary group border-border/60 cursor-pointer scroll-mt-10 outline-none focus-visible:ring-1 focus-visible:ring-inset"
              >
                {/* 初回案内は、実際にピンが出る先頭行のこの欄を指す */}
                <TableCell
                  data-tour={index === 0 ? "pin" : undefined}
                  className="pr-1 pl-3 text-center"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(app.appId);
                    }}
                    title={app.isPinned ? "ピン留めを外す" : "ピン留めする"}
                    aria-pressed={!!app.isPinned}
                    aria-label={
                      app.isPinned ? "ピン留めを外す" : "ピン留めする"
                    }
                  >
                    <Pin
                      className={cn(
                        "h-3.5 w-3.5",
                        app.isPinned
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/0 group-hover:text-muted-foreground/70 group-focus-visible:text-muted-foreground/70",
                      )}
                    />
                  </Button>
                </TableCell>

                {/* 1行1アプリ。名前もコードも説明も、はみ出す分は列の幅で切る */}
                <TableCell>
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-medium" title={app.name}>
                      {app.name}
                    </span>
                    {app.code && (
                      <span className="text-muted-foreground/70 shrink-0 font-mono text-xs">
                        {app.code}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                  {app.appId}
                </TableCell>

                {/* 0件は空欄にする。数字がある行だけが目に入るように */}
                <TableCell className="text-right tabular-nums">
                  {queryCount > 0 ? queryCount : null}
                </TableCell>

                <TableCell
                  className="text-muted-foreground text-xs whitespace-nowrap"
                  title={formatAbsoluteDateTime(app.modifiedAt) || undefined}
                >
                  {relative || "-"}
                </TableCell>

                <TableCell className="pr-4 text-right">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        onShowDetail(app);
                      }}
                      title="詳細を表示"
                      aria-label={`${app.name} の詳細`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      ))}
    </table>
  );
}
