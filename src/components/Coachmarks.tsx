import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * 初回だけ出す操作の案内。
 *
 * 画面を止めない作りにしている。暗幕はクリックを受け取らないので、
 * 案内が出たまま普段どおり触れるし、キー操作もそのまま効く。
 * 「読ませてから使わせる」より「使いながら気づかせる」ほうが、
 * 三画面しかないこのアプリには合っている。
 *
 * 指す先は data-tour 属性で決める。見つからない手順は黙って飛ばすので、
 * 幅が狭くて隠れている要素を指したまま止まることはない。
 */

export interface CoachmarkStep {
  /** 指す要素の data-tour 値 */
  target: string;
  title: string;
  body: string;
}

interface CoachmarksProps {
  steps: CoachmarkStep[];
  open: boolean;
  /** 最後まで見た、または閉じたとき */
  onClose: () => void;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 穴の周りに少しだけ余白をとる */
const HOLE_PADDING = 6;
const CARD_WIDTH = 320;
const CARD_GAP = 12;

function findRect(target: string): Rect | null {
  const element = document.querySelector(`[data-tour="${target}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return {
    left: rect.left - HOLE_PADDING,
    top: rect.top - HOLE_PADDING,
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
}

export default function Coachmarks({ steps, open, onClose }: CoachmarksProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  // 開き直したときは最初から
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // 指す先の位置は、開いている間ずっと追いかける（窓の大きさもスクロールも変わる）
  useEffect(() => {
    if (!open || !step) return;

    const measure = () => setRect(findRect(step.target));
    measure();

    window.addEventListener("resize", measure);
    // スクロールは対象の祖先で起きるので、捕捉フェーズで拾う
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  const close = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  const next = useCallback(() => {
    if (index >= steps.length - 1) {
      close();
      return;
    }
    setIndex(index + 1);
  }, [index, steps.length, close]);

  // 指す先が無い手順は飛ばす（幅が狭くて隠れている列など）
  useEffect(() => {
    if (!open || !step || rect) return;
    if (findRect(step.target)) return;
    next();
  }, [open, step, rect, next]);

  /*
   * 画面側にもEscapeで戻る作りがあるので、こちらが先に受け取って止める。
   * そのために捕捉フェーズで拾い、preventDefaultで「処理済み」を伝える
   * （画面側は defaultPrevented を見て降りる）。
   * ←→は文字入力のカーソル移動と衝突するので、入力欄の中では譲る。
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      const target = event.target as HTMLElement | null;
      const inTextField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inTextField) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        setIndex(index - 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, index, next, close]);

  if (!open || !step || !rect) return null;

  const below = rect.top + rect.height + CARD_GAP;
  const fitsBelow = below + 180 < window.innerHeight;
  const cardTop = fitsBelow ? below : Math.max(CARD_GAP, rect.top - 180);
  const cardLeft = Math.min(
    Math.max(CARD_GAP, rect.left),
    Math.max(CARD_GAP, window.innerWidth - CARD_WIDTH - CARD_GAP),
  );
  const isLast = index === steps.length - 1;

  return createPortal(
    <>
      {/*
        暗幕。指す先の上下左右を4枚で囲むことで、その一点だけ明るく残す。
        巨大な影で抜くやり方より、どの環境でも同じ濃さで出る。
      */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <div
          className="absolute inset-x-0 top-0 bg-black/50"
          style={{ height: Math.max(0, rect.top) }}
        />
        <div
          className="absolute inset-x-0 bottom-0 bg-black/50"
          style={{ top: rect.top + rect.height }}
        />
        <div
          className="absolute left-0 bg-black/50"
          style={{
            top: rect.top,
            height: rect.height,
            width: Math.max(0, rect.left),
          }}
        />
        <div
          className="absolute right-0 bg-black/50"
          style={{
            top: rect.top,
            height: rect.height,
            left: rect.left + rect.width,
          }}
        />
        {/* 指す先の輪郭。明るいまま残った矩形の縁を示す */}
        <div
          className="ring-primary absolute rounded-md ring-2"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      </div>

      <div
        role="dialog"
        aria-label="使い方の案内"
        className="border-border bg-card fixed z-50 rounded-lg border p-4 shadow-lg"
        style={{ left: cardLeft, top: cardTop, width: CARD_WIDTH }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-foreground text-sm font-semibold">
            {step.title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="案内を閉じる"
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          {step.body}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1" aria-hidden="true">
            {steps.map((item, dot) => (
              <span
                key={item.target}
                className={`h-1.5 rounded-full transition-all ${
                  dot === index ? "bg-primary w-4" : "bg-border w-1.5"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-xs tabular-nums">
              {index + 1} / {steps.length}
            </span>
            <Button size="sm" className="h-7" onClick={next}>
              {isLast ? "閉じる" : "次へ"}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
