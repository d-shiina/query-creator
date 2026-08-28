/**
 * 初回だけ出す案内を「見た」かどうかの記録。
 *
 * IDに版を付けているのは、画面の作りを変えたときに出し直せるようにするため。
 * 案内の中身が変わったら版を上げる（見た人にもう一度だけ出る）。
 */

const STORAGE_KEY = "kintone-tours-seen";

export const TOUR_APP_LIST = "app-list@2";
export const TOUR_QUERY_LIST = "query-list@1";
export const TOUR_QUERY_BUILDER = "query-builder@2";

function read(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasSeenTour(id: string): boolean {
  return read().includes(id);
}

export function markTourSeen(id: string): void {
  if (hasSeenTour(id)) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...read(), id]));
  } catch {
    // 記録できなくても、案内が次回また出るだけなので黙って続ける
  }
}

/** 「使い方をもう一度」から呼ぶ。IDを省略すると全部出し直す */
export function resetTour(id?: string): void {
  if (id === undefined) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(read().filter((seen) => seen !== id)),
    );
  } catch {
    // 同上
  }
}
