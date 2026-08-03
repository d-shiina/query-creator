/**
 * kintone REST APIのURL構築ユーティリティ。
 *
 * ゲストスペース内のアプリは、通常の `/k/v1/...` ではなく
 * `/k/guest/{スペースID}/v1/...` を使う必要がある。
 * このパスを使わないと、アプリ一覧には出てくるのにフィールド情報や
 * レコード取得だけが失敗する（ゲストスペースのアプリでフィールドが
 * 表示されない不具合の原因）。
 *
 * なお `GET /k/v1/apps.json` はユーザーが閲覧可能なゲストスペースの
 * アプリも返すため、アプリ一覧の取得は通常パスのままでよい。
 */

/**
 * ゲストスペースIDを正規化する。
 *
 * kintoneのレスポンスやUIの状態によって spaceId は null / undefined /
 * 空文字 / 文字列 "null" のいずれにもなり得るため、
 * 「スペースに属していない」ケースをすべて null に寄せる。
 *
 * @returns 有効なスペースIDの文字列、そうでなければ null
 */
export function normalizeGuestSpaceId(
  spaceId: string | number | null | undefined,
): string | null {
  if (spaceId === null || spaceId === undefined) return null;

  const normalized = String(spaceId).trim();
  if (normalized === "" || normalized === "null" || normalized === "undefined") {
    return null;
  }

  return normalized;
}

/**
 * kintone REST APIのURLを構築する。
 *
 * @param subdomain cybozu.comのサブドメイン
 * @param endpoint `/k/v1/` 以降のパス（例: `app/form/fields.json?app=1`）
 * @param guestSpaceId ゲストスペースID。指定時は `/k/guest/{id}/v1/` を使う
 */
export function buildKintoneUrl(
  subdomain: string,
  endpoint: string,
  guestSpaceId?: string | number | null,
): string {
  const baseUrl = `https://${subdomain}.cybozu.com`;
  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  const spaceId = normalizeGuestSpaceId(guestSpaceId);

  return spaceId
    ? `${baseUrl}/k/guest/${spaceId}/v1/${normalizedEndpoint}`
    : `${baseUrl}/k/v1/${normalizedEndpoint}`;
}
