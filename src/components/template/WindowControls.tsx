import React, { useEffect, useState } from "react";

/**
 * OS標準のタイトルバーを廃止（BrowserWindowのtitleBarStyle:"hidden"）した代わりの
 * ウィンドウ操作ボタン。ヘッダーの右端に、テーマ切替やログアウトと同じ並びの
 * 一要素として置く。
 *
 * 以前は画面右上に fixed で重ねていたが、その真下にスクロール領域の
 * スクロールバーが入るとクリックがスクロールバー側に取られ、
 * 閉じるボタンが押せなくなっていた。流し込みの要素にすればその衝突は起きない。
 *
 * - ヘッダー側は `draglayer` を付けてバー全体をドラッグ領域にする
 * - ボタンはドラッグ対象から外す（.no-drag）
 * - macOSは信号機ボタンがOS側に残るので、独自ボタンは描画しない
 */

/** macOSの信号機ボタンを避けるために左端へ空ける余白 */
export const TRAFFIC_LIGHTS_WIDTH = 78;

export function isMacOS() {
  return window.electronWindow?.platform === "darwin";
}

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
      className={`no-drag text-foreground/70 flex h-8 w-[46px] items-center justify-center transition-colors ${
        variant === "close"
          ? "hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90"
          : "hover:bg-foreground/10 active:bg-foreground/15"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * タイトルバーを兼ねるヘッダーに当てる余白。
 * Windows/Linuxのボタンはヘッダーの中に並ぶので余白は要らないが、
 * macOSの信号機ボタンはOSが左上に描くため、その分だけ左を空ける。
 */
export function titleBarInsetStyle(): React.CSSProperties {
  return isMacOS() ? { paddingLeft: TRAFFIC_LIGHTS_WIDTH } : {};
}

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

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

  if (isMacOS()) return null;

  return (
    <div className="ml-1 flex self-stretch">
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
  );
}
