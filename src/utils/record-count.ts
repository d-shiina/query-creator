import { KintoneApp, KintoneAuth } from "@/types/kintone";

/**
 * アプリのレコード件数を取得する。
 *
 * kintoneのアプリ一覧API（apps.json）は件数を返さないため、件数は
 * アプリ1件につき records.json を1回叩いて取るしかない。一覧の全行で
 * 呼ぶとAPI消費が行数に比例するので、詳細ダイアログを開いたときだけ
 * 取りに行き、結果はアプリが起動している間だけキャッシュする。
 */

export type RecordCountResult =
  | { status: "success"; count: number }
  | { status: "error"; message: string };

/** appId -> 件数。プロセスが終われば消える程度の寿命でよい */
const cache = new Map<string, number>();

/** 取得済みなら件数を返す。未取得なら undefined */
export function getCachedRecordCount(appId: string): number | undefined {
  return cache.get(appId);
}

/** appIdを渡すとそのアプリだけ、省略すると全件を捨てる */
export function clearRecordCountCache(appId?: string): void {
  if (appId === undefined) {
    cache.clear();
  } else {
    cache.delete(appId);
  }
}

/**
 * レコードは見えないがアプリは見える、という権限構成はkintoneでは普通にある。
 * 生のエラー文（HTTPステータスとJSON）をそのまま出しても伝わらないので、
 * よくある失敗だけ言い換える。
 */
function describeError(message: string): string {
  if (message.includes("403")) {
    return "レコードの閲覧権限がないため取得できませんでした";
  }
  if (message.includes("520") || message.includes("404")) {
    return "このアプリのレコードを取得できませんでした";
  }
  return message;
}

/**
 * 件数を取得する。`limit 1` は転送量を1レコードに抑えるための指定で、
 * totalCount は limit に関係なく条件に一致した総数を返す。
 */
export async function fetchRecordCount(
  auth: KintoneAuth,
  app: Pick<KintoneApp, "appId" | "spaceId">,
  options?: { force?: boolean },
): Promise<RecordCountResult> {
  if (!options?.force) {
    const cached = cache.get(app.appId);
    if (cached !== undefined) {
      return { status: "success", count: cached };
    }
  }

  try {
    const result = await window.kintoneAPI.executeQuery(
      auth,
      app.appId,
      "limit 1",
      app.spaceId,
      { totalCount: true },
    );

    if (!result.success) {
      return {
        status: "error",
        message: describeError(
          result.error || "レコード件数を取得できませんでした",
        ),
      };
    }

    const count = Number(result.data?.totalCount);
    if (!Number.isFinite(count)) {
      return {
        status: "error",
        message: "レコード件数を取得できませんでした",
      };
    }

    cache.set(app.appId, count);
    return { status: "success", count };
  } catch (error) {
    return {
      status: "error",
      message: describeError(
        error instanceof Error
          ? error.message
          : "レコード件数の取得に失敗しました",
      ),
    };
  }
}
