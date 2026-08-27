import React, { useEffect, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";

/**
 * Windows標準のタイトルバーを廃止（BrowserWindowのtitleBarStyle:"hidden"）した代わりに
 * アプリ側で描画するタイトルバー。
 *
 * - バー全体はドラッグ領域（-webkit-app-region: drag）
 * - ボタンだけはクリックできるようドラッグ対象から外す
 * - macOSでは信号機ボタンがOS側に残るので、独自ボタンは出さず左側に余白だけ確保する
 */

const TITLE = "kintone API Query Creator";

/** Windows 11のタイトルバーに合わせた線画アイコン（10x10のグリッド） */
function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="0.5"
        y="2.5"
        width="7"
        height="7"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M2.5 2.5V0.5h7v7h-2"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M0.5 0.5l9 9M9.5 0.5l-9 9"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

interface WindowButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "close";
  children: React.ReactNode;
}

function WindowButton({
  label,
  onClick,
  variant = "default",
  children,
}: WindowButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`no-drag text-foreground/80 flex h-8 w-[46px] items-center justify-center transition-colors ${
        variant === "close"
          ? "hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90"
          : "hover:bg-foreground/10 active:bg-foreground/15"
      }`}
    >
      {children}
    </button>
  );
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const isMac = window.electronWindow?.platform === "darwin";

  useEffect(() => {
    const api = window.electronWindow;
    if (!api) return;

    // 先に購読してから初期値を問い合わせる。問い合わせ中に状態が変わった場合は
    // 後から届く初期値で上書きしないようにする。
    let changed = false;
    const unsubscribe = api.onMaximizeChange?.((value) => {
      changed = true;
      setIsMaximized(value);
    });
    api.isMaximized?.().then((value) => {
      if (!changed) setIsMaximized(value);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <header
      className={`draglayer border-border bg-card relative z-[60] flex h-8 shrink-0 items-center border-b select-none ${
        isFocused ? "" : "opacity-70"
      }`}
    >
      <div className={`flex items-center gap-2 px-3 ${isMac ? "pl-20" : ""}`}>
        <AppLogo size={20} className="rounded-[4px]" />
        <span className="text-muted-foreground text-xs font-medium">
          {TITLE}
        </span>
      </div>

      {/* 中央の空白もドラッグできるように、ボタン以外は素の要素のままにする */}
      <div className="flex-1" />

      {!isMac && (
        <div className="flex items-center">
          <WindowButton
            label="最小化"
            onClick={() => window.electronWindow?.minimize()}
          >
            <MinimizeIcon />
          </WindowButton>
          <WindowButton
            label={isMaximized ? "元のサイズに戻す" : "最大化"}
            onClick={() => window.electronWindow?.maximize()}
          >
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </WindowButton>
          <WindowButton
            label="閉じる"
            variant="close"
            onClick={() => window.electronWindow?.close()}
          >
            <CloseIcon />
          </WindowButton>
        </div>
      )}
    </header>
  );
}
