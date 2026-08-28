import React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/utils/tailwind";

/**
 * 一覧テーブルの共通部品。
 *
 * アプリ一覧とクエリ一覧は中身が違うだけで、並べ替えの見せ方も
 * グループの区切り方も同じであってほしいので、そこだけ共有する。
 */

export type SortOrder = "asc" | "desc";

/** 並べ替え対象の列だけ向きを出す。それ以外はホバーしたときにだけ薄く示す */
export function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: SortOrder;
}) {
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

/** 押すと並べ替わる見出しセル。押せない列は label だけ置く */
export function SortableHead({
  label,
  className,
  align,
  active,
  order,
  onSort,
}: {
  label: string;
  className?: string;
  align?: "right";
  /** 未指定なら並べ替えできない列として描く */
  active?: boolean;
  order?: SortOrder;
  onSort?: () => void;
}) {
  return (
    <TableHead
      className={cn(className, align === "right" && "text-right")}
      aria-sort={
        onSort && active
          ? order === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "group hover:text-foreground inline-flex items-center gap-1 transition-colors",
            align === "right" && "flex-row-reverse",
            active && "text-foreground",
          )}
        >
          {label}
          <SortIcon active={!!active} order={order ?? "asc"} />
        </button>
      ) : (
        label
      )}
    </TableHead>
  );
}

/** 「ピン留め」「最近使った」のようなグループの区切り */
export function SectionRow({
  label,
  count,
  colSpan,
}: {
  label: string;
  count: number;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="text-muted-foreground bg-muted/40 border-border border-b px-4 py-1 text-xs"
      >
        {label}
        <span className="ml-1.5 opacity-60">{count}</span>
      </td>
    </tr>
  );
}

/** 一覧の下に置く、キー操作の手引き */
export function ShortcutBar({
  hints,
}: {
  hints: { keys: string; label: string }[];
}) {
  return (
    <div className="border-border bg-card text-muted-foreground flex h-8 shrink-0 items-center gap-3 border-t px-4 text-xs">
      {hints.map((hint) => (
        <span key={hint.keys} className="flex items-center gap-1">
          <kbd className="border-border text-muted-foreground rounded border px-1 py-0.5 font-mono text-[10px] leading-none">
            {hint.keys}
          </kbd>
          {hint.label}
        </span>
      ))}
    </div>
  );
}
