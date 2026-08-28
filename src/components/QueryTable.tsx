import React, { useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Pin, Trash2 } from "lucide-react";
import { SavedQuery } from "@/hooks/useQueryGenerator";
import { SectionRow, SortOrder, SortableHead } from "@/components/table-parts";
import {
  formatAbsoluteDateTime,
  formatRelativeDate,
} from "@/utils/date-display";
import { cn } from "@/utils/tailwind";

/**
 * 保存済みクエリの一覧。
 *
 * アプリ一覧と同じ作法で作る（1行1件・見出し固定・ピン留めを上へ・
 * ↑↓とEnterで送れる）。画面が変わるたびに操作を覚え直さずに済むように、
 * 並びも列の見せ方も揃えている。
 *
 * クエリを見分ける手掛かりは名前だけでは足りないので、実際に発行される
 * クエリ本文を列として常に出す。メモは補足なので幅が足りなければ落とす。
 */

type SortField = "name" | "createdAt";

export interface QueryTableHandle {
  focusRow: (index?: number) => void;
}

interface QueryTableProps {
  ref?: React.Ref<QueryTableHandle>;
  queries: SavedQuery[];
  /** ピン留め済みのクエリID */
  pinnedIds: Set<string>;
  /** 一括削除のために選ばれているクエリID */
  selectedIds: Set<string>;
  onEditQuery: (query: SavedQuery) => void;
  onTogglePin: (queryId: string) => void;
  onToggleSelect: (queryId: string) => void;
  onToggleSelectAll: () => void;
  onDeleteQuery: (query: SavedQuery) => void;
}

const COLUMNS: {
  field?: SortField;
  label: string;
  className: string;
}[] = [
  { field: "name", label: "クエリ名", className: "w-[20rem]" },
  { label: "メモ", className: "hidden w-[14rem] xl:table-cell" },
  // 幅を持たない列が余りを受け取る
  { label: "クエリ", className: "" },
  { field: "createdAt", label: "作成", className: "w-24" },
];

export default function QueryTable({
  ref,
  queries,
  pinnedIds,
  selectedIds,
  onEditQuery,
  onTogglePin,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteQuery,
}: QueryTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeIndex, setActiveIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focusRow: (index = 0) => rowRefs.current[index]?.focus(),
  }));

  const sections = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;

    const bySort = (a: SavedQuery, b: SavedQuery) => {
      const aValue =
        sortField === "name"
          ? a.name.toLowerCase()
          : new Date(a.createdAt).getTime() || 0;
      const bValue =
        sortField === "name"
          ? b.name.toLowerCase()
          : new Date(b.createdAt).getTime() || 0;

      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      return a.id.localeCompare(b.id);
    };

    const pinned = queries
      .filter((query) => pinnedIds.has(query.id))
      .sort(bySort);
    const rest = queries
      .filter((query) => !pinnedIds.has(query.id))
      .sort(bySort);

    return [
      { key: "pinned", label: "ピン留め", queries: pinned },
      { key: "rest", label: "すべて", queries: rest },
    ].filter((section) => section.queries.length > 0);
  }, [queries, pinnedIds, sortField, sortOrder]);

  const flatQueries = useMemo(
    () => sections.flatMap((section) => section.queries),
    [sections],
  );

  const focusableIndex = Math.min(
    activeIndex,
    Math.max(flatQueries.length - 1, 0),
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(field);
    setSortOrder(field === "name" ? "asc" : "desc");
  };

  /** ↑↓で移動、Enterで編集、Spaceで選択、Deleteで削除の確認へ */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (event.target !== event.currentTarget) return;

    const move = (next: number) => {
      event.preventDefault();
      const clamped = Math.max(0, Math.min(next, flatQueries.length - 1));
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
        return move(flatQueries.length - 1);
      case "Enter":
        event.preventDefault();
        return onEditQuery(flatQueries[index]);
      case " ":
        event.preventDefault();
        return onToggleSelect(flatQueries[index].id);
      case "Delete":
      case "Backspace":
        event.preventDefault();
        return onDeleteQuery(flatQueries[index]);
    }
  };

  if (flatQueries.length === 0) {
    return null;
  }

  const allSelected =
    flatQueries.length > 0 &&
    flatQueries.every((query) => selectedIds.has(query.id));
  const showSectionLabels = sections.length > 1;
  let rowIndex = -1;

  return (
    <table className="w-full table-fixed text-sm">
      <thead className="bg-card sticky top-0 z-10">
        <tr className="border-border border-b">
          <TableHead className="w-10 pl-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="すべて選択"
            />
          </TableHead>
          <TableHead className="w-9" aria-label="ピン留め" />
          {COLUMNS.map((column) => (
            <SortableHead
              key={column.label}
              label={column.label}
              className={column.className}
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
              count={section.queries.length}
              colSpan={COLUMNS.length + 3}
            />
          )}

          {section.queries.map((query) => {
            const isPinned = pinnedIds.has(query.id);
            const isSelected = selectedIds.has(query.id);
            rowIndex += 1;
            const index = rowIndex;

            return (
              <TableRow
                key={query.id}
                ref={(element) => {
                  rowRefs.current[index] = element;
                }}
                tabIndex={index === focusableIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => onEditQuery(query)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                data-state={isSelected ? "selected" : undefined}
                className="focus-visible:bg-accent focus-visible:ring-primary group data-[state=selected]:bg-accent/40 cursor-pointer scroll-mt-10 outline-none focus-visible:ring-1 focus-visible:ring-inset"
              >
                <TableCell
                  className="pl-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(query.id)}
                    aria-label={`${query.name} を選択`}
                  />
                </TableCell>

                <TableCell className="px-0 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin(query.id);
                    }}
                    title={isPinned ? "ピン留めを外す" : "ピン留めする"}
                    aria-label={isPinned ? "ピン留めを外す" : "ピン留めする"}
                    aria-pressed={isPinned}
                  >
                    <Pin
                      className={cn(
                        "h-3.5 w-3.5",
                        isPinned
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/0 group-hover:text-muted-foreground/70 group-focus-visible:text-muted-foreground/70",
                      )}
                    />
                  </Button>
                </TableCell>

                <TableCell>
                  <div className="truncate font-medium" title={query.name}>
                    {query.name}
                  </div>
                </TableCell>

                <TableCell className="hidden xl:table-cell">
                  {query.memo ? (
                    <div
                      className="text-muted-foreground truncate text-xs"
                      title={query.memo}
                    >
                      {query.memo}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30 text-xs">-</span>
                  )}
                </TableCell>

                <TableCell>
                  {query.generatedQuery ? (
                    <code
                      className="text-muted-foreground block truncate font-mono text-xs"
                      title={query.generatedQuery}
                    >
                      {query.generatedQuery}
                    </code>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">
                      条件なし（全件）
                    </span>
                  )}
                </TableCell>

                <TableCell
                  className="text-muted-foreground text-xs whitespace-nowrap"
                  title={formatAbsoluteDateTime(query.createdAt) || undefined}
                >
                  {formatRelativeDate(query.createdAt) || "-"}
                </TableCell>

                <TableCell className="pr-4 text-right">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteQuery(query);
                      }}
                      title="削除"
                      aria-label={`${query.name} を削除`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
