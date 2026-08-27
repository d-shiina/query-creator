import { useCallback, useEffect, useState } from "react";

/**
 * 左右に並べたペインの幅の比率を保持する。
 * 値は「右ペインが占める割合(%)」で、次回以降も同じ配分で開けるよう保存する。
 */

/** 片側が使い物にならない幅まで潰れないようにする */
export const MIN_SPLIT_RATIO = 20;
export const MAX_SPLIT_RATIO = 75;

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return MIN_SPLIT_RATIO;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));
}

function readStoredRatio(key: string, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored == null) return fallback;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? clampSplitRatio(parsed) : fallback;
  } catch {
    // ストレージが使えない環境でも既定値で動かす
    return fallback;
  }
}

export function useSplitRatio(storageKey: string, defaultRatio: number) {
  const [ratio, setRatio] = useState(() =>
    readStoredRatio(storageKey, clampSplitRatio(defaultRatio)),
  );

  const updateRatio = useCallback(
    (next: number) => setRatio(clampSplitRatio(next)),
    [],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(ratio));
    } catch {
      // 保存できなくても表示上は問題ない
    }
  }, [storageKey, ratio]);

  return [ratio, updateRatio] as const;
}

/** 画面幅の条件に一致しているかを購読する */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? false,
  );

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);

    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
