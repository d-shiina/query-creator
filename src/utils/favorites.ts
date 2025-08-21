// ローカルストレージでお気に入りアプリを管理するユーティリティ

const FAVORITES_KEY = "kintone-favorites";
const QUERY_FAVORITES_KEY = "kintone-query-favorites";

export interface FavoriteApp {
  appId: string;
  addedAt: string;
}

export interface FavoriteQuery {
  queryId: string;
  appId: string;
  addedAt: string;
}

export function getFavoriteApps(): FavoriteApp[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToFavorites(appId: string): void {
  const favorites = getFavoriteApps();
  const exists = favorites.some((fav) => fav.appId === appId);

  if (!exists) {
    favorites.push({
      appId,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export function removeFromFavorites(appId: string): void {
  const favorites = getFavoriteApps();
  const filtered = favorites.filter((fav) => fav.appId !== appId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

export function isAppFavorite(appId: string): boolean {
  const favorites = getFavoriteApps();
  return favorites.some((fav) => fav.appId === appId);
}

// クエリお気に入り機能
export function getFavoriteQueries(): FavoriteQuery[] {
  try {
    const stored = localStorage.getItem(QUERY_FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addQueryToFavorites(queryId: string, appId: string): void {
  const favorites = getFavoriteQueries();
  const exists = favorites.some((fav) => fav.queryId === queryId);

  if (!exists) {
    favorites.push({
      queryId,
      appId,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(QUERY_FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export function removeQueryFromFavorites(queryId: string): void {
  const favorites = getFavoriteQueries();
  const filtered = favorites.filter((fav) => fav.queryId !== queryId);
  localStorage.setItem(QUERY_FAVORITES_KEY, JSON.stringify(filtered));
}

export function isQueryFavorite(queryId: string): boolean {
  const favorites = getFavoriteQueries();
  return favorites.some((fav) => fav.queryId === queryId);
}
