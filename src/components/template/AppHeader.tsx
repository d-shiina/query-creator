import React from "react";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ToggleTheme from "@/components/ToggleTheme";
import WindowControls, {
  titleBarInsetStyle,
} from "@/components/template/WindowControls";

/**
 * 全画面で共通のヘッダー。OS標準のタイトルバーを廃止しているので、
 * この帯がタイトルバーを兼ねる（バー全体がウィンドウのドラッグ領域）。
 *
 * 「戻る → 現在地 → 対象の手掛かり → この画面の操作 → 共通の操作」を
 * 常に同じ並び・同じ高さで出し、画面ごとに見た目が変わらないようにする。
 * 枠付きのボタンを並べると帯が騒がしくなるので、操作はすべて枠なしにして
 * 太さと色だけで主従をつける。
 */

export interface BreadcrumbItem {
  label: string;
  /** 押せる場合のみ指定する。現在地には渡さない */
  onClick?: () => void;
  /** 長いものは省略して良い（アプリ名など） */
  truncate?: boolean;
}

interface AppHeaderProps {
  onBack?: () => void;
  backLabel?: string;
  breadcrumb: BreadcrumbItem[];
  /** パンくずの右に添える手掛かり（アプリIDなど） */
  meta?: React.ReactNode;
  /** この画面固有の操作（枠なしのアイコンボタンを想定） */
  actions?: React.ReactNode;
  onLogout: () => void;
}

export default function AppHeader({
  onBack,
  backLabel = "戻る",
  breadcrumb,
  meta,
  actions,
  onLogout,
}: AppHeaderProps) {
  return (
    <header
      className="draglayer border-border bg-card flex h-10 shrink-0 items-center gap-1 border-b pl-1"
      style={titleBarInsetStyle()}
    >
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : (
        <span className="w-2 shrink-0" />
      )}

      <nav
        aria-label="現在地"
        className="flex min-w-0 items-center gap-1 text-sm"
      >
        {breadcrumb.map((item, index) => {
          const isCurrent = index === breadcrumb.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="text-muted-foreground/40 h-3.5 w-3.5 shrink-0"
                />
              )}
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`text-muted-foreground hover:text-foreground rounded px-1 transition-colors ${
                    item.truncate ? "min-w-0 truncate" : "shrink-0"
                  }`}
                  title={item.truncate ? item.label : undefined}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={`px-1 ${
                    isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  } ${item.truncate ? "min-w-0 truncate" : "shrink-0"}`}
                  title={item.truncate ? item.label : undefined}
                >
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {meta}
      {actions}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 self-stretch pl-1">
        <div className="flex items-center gap-0.5 self-center">
          <ToggleTheme variant="ghost" className="h-7 w-7" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
          >
            <LogOut className="mr-1 h-3.5 w-3.5" />
            ログアウト
          </Button>
        </div>
        <WindowControls />
      </div>
    </header>
  );
}

/** ヘッダーに添える、押すとコピーできる識別子のチップ */
export function HeaderIdChip({
  label,
  copied,
  onCopy,
  title,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={title}
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors"
    >
      {label}
      <span className={copied ? "text-green-600" : "opacity-60"}>
        {copied ? "✓" : "⧉"}
      </span>
    </button>
  );
}
