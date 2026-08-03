/**
 * 生成したkintoneクエリを、貼り付け先の環境に合わせた表記へ変換するユーティリティ。
 *
 * queryUtils.generateQuery が返すのは「素のkintoneクエリ」で、
 * 文字列リテラル内の `"` は kintoneクエリ構文のルールに従って `\"` にエスケープ済み。
 * このエスケープはどの言語から呼び出す場合でも必要なため、ここでは触らない。
 *
 * ここで扱うのは「クエリをJSONリクエストボディの文字列へ直接埋め込むか」の違い。
 * VBSノードのようにJSONを文字列連結で組み立てる場合はJSONエスケープが要るが、
 * Pythonのようにdictを渡してライブラリにJSON化させる場合は不要（二重エスケープになる）。
 */

/** クエリ文字列の出力形式 */
export type QueryOutputFormat = "vbs" | "python";

/** 出力形式の選択肢（UIの表示順） */
export const QUERY_OUTPUT_FORMATS: ReadonlyArray<{
  value: QueryOutputFormat;
  label: string;
  description: string;
}> = [
  {
    value: "vbs",
    label: "VBS (JSON埋め込み)",
    description:
      "JSONリクエストボディを文字列連結で組み立てる場合。\" が \\\" にエスケープされます。",
  },
  {
    value: "python",
    label: "Python (そのまま)",
    description:
      "requestsなどにdictを渡す場合。ライブラリがJSONエスケープするため追加のエスケープは不要です。",
  },
];

/**
 * クエリをJSON文字列リテラルの中身へ変換する（前後の " は付けない）。
 * 例: `name = "a\"b"` -> `name = \"a\\\"b\"`
 */
function toJsonStringBody(query: string): string {
  return JSON.stringify(query).slice(1, -1);
}

/**
 * 出力形式に応じてクエリ文字列を整形する。
 * @param query queryUtils.generateQuery が返す素のkintoneクエリ
 * @param format 貼り付け先の環境
 * @returns 貼り付け用に整形されたクエリ文字列
 */
export function formatQueryForOutput(
  query: string | null | undefined,
  format: QueryOutputFormat,
): string {
  if (!query) return "";

  switch (format) {
    case "vbs":
      return toJsonStringBody(query);
    case "python":
      return query;
    default:
      return query;
  }
}
