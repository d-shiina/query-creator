/**
 * 最近開いたアプリ。
 *
 * 一覧の上に出す並びを、利用者に印を付けさせずに決めるための記録。
 * ピン留めが「これは常に上」という宣言なのに対し、こちらは実際の使用から
 * 自動で決まる。保存先はローカルなので、端末をまたいでは共有されない。
 */

const STORAGE_KEY = "kintone-recent-apps";

/** 履歴として保持する上限。一覧に出すのはこのうち先頭の数件 */
const LIMIT = 20;

interface RecentApp {
  appId: string;
  openedAt: string;
}

function read(): RecentApp[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is RecentApp => !!entry?.appId)
      : [];
  } catch {
    return [];
  }
}

/** 新しい順のappId */
export function getRecentAppIds(): string[] {
  return read().map((entry) => entry.appId);
}

/** 開いたことを記録し、記録後の新しい順のappIdを返す */
export function recordAppOpened(appId: string): string[] {
  const next = [
    { appId, openedAt: new Date().toISOString() },
    ...read().filter((entry) => entry.appId !== appId),
  ].slice(0, LIMIT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても並びが変わらないだけなので、開く動作は止めない
  }

  return next.map((entry) => entry.appId);
}

export function clearRecentApps(): void {
  localStorage.removeItem(STORAGE_KEY);
}
