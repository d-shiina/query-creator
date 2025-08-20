// ローカルストレージでお気に入りアプリを管理するユーティリティ

const FAVORITES_KEY = 'kintone-favorites';

export interface FavoriteApp {
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
  const exists = favorites.some(fav => fav.appId === appId);
  
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
  const filtered = favorites.filter(fav => fav.appId !== appId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

export function isAppFavorite(appId: string): boolean {
  const favorites = getFavoriteApps();
  return favorites.some(fav => fav.appId === appId);
}
