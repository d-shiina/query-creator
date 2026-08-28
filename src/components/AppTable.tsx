import React, { useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  SectionRow,
  SortOrder,
  SortableHead,
} from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { ChevronRight, Info, Pin } from "lucide-react";
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
 * 上には「ピン留め」と「最近使った」を置く。前者は利用者が明示した宣言、
 * 後者は実際に開いた記録から自動で決まる並び。数百アプリある環境では、
 * 手で印を付けて回らなくても常用アプリが上に来るほうが早い。
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
  /** 新しい順のappId。「最近使った」の並びに使う */
  recentAppIds: string[];
  onSelectApp: (app: KintoneApp) => void;
  onTogglePin: (appId: string) => void;
  onShowDetail: (app: KintoneApp) => void;
}

/** 「最近使った」に出す件数。多いと「すべて」との区別が薄れる */
const RECENT_LIMIT = 5;

/**
 * 幅は列ごとに固定する（table-fixed）。説明のように長さが読めない値があると、
 * 自動幅では列が押し出されて横スクロールになるため。
 * 余りは説明に渡し、広い画面ほど説明が読めるようにする。
 */
const COLUMNS: {
  /** 並べ替えできない列は field を持たない */
  field?: SortField;
  label: string;
  className: string;
  align?: "right";
}[] = [
  { field: "name", label: "アプリ名", className: "w-[32rem]" },
  // 幅を持たない列が余りを受け取る。広い画面では説明が伸びる
  { label: "説明", className: "hidden xl:table-cell" },
  { field: "appId", label: "ID", className: "w-16" },
  { field: "queryCount", label: "クエリ", className: "w-16", align: "right" },
  { field: "modifiedAt", label: "更新", className: "w-24" },
];

export default function AppTable({
  ref,
  apps,
  queryCounts,
  recentAppIds,
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
    focusRow: (index = 0) => rowRefs.current[index]?.focus(),
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

    // 「最近使った」だけは並べ替えに従わない。新しい順であること自体が中身なので
    const recent = recentAppIds
      .map((appId) => apps.find((app) => app.appId === appId && !app.isPinned))
      .filter((app): app is KintoneApp => !!app)
      .slice(0, RECENT_LIMIT);

    const shown = new Set([...pinned, ...recent].map((app) => app.appId));
    const rest = apps.filter((app) => !shown.has(app.appId)).sort(bySort);

    return [
      { key: "pinned", label: "ピン留め", apps: pinned },
      { key: "recent", label: "最近使った", apps: recent },
      { key: "rest", label: "すべて", apps: rest },
    ].filter((section) => section.apps.length > 0);
  }, [apps, queryCounts, recentAppIds, sortField, sortOrder]);

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
                className="focus-visible:bg-accent/60 focus-visible:ring-primary group cursor-pointer scroll-mt-10 outline-none focus-visible:ring-1 focus-visible:ring-inset"
              >
                <TableCell className="pr-1 pl-3 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(app.appId);
                    }}
                    title={
                      app.isPinned ? "ピン留めを外す" : "ピン留めして上に固定"
                    }
                    aria-pressed={!!app.isPinned}
                    aria-label={
                      app.isPinned ? "ピン留めを外す" : "ピン留めして上に固定"
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
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {app.code}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden xl:table-cell">
                  {app.description ? (
                    <div
                      className="text-muted-foreground truncate text-xs"
                      title={cleanAndTruncateText(app.description, 300)}
                    >
                      {cleanAndTruncateText(app.description, 120)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30 text-xs">-</span>
                  )}
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
      ))}
    </table>
  );
}
