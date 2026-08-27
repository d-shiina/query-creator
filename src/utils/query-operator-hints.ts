import type { QueryOperator } from "@/types/kintone";

/**
 * 演算子ごとの注意書き。
 *
 * likeは「含む」と書かれているが、素の部分一致ではない。
 * kintoneの文字列検索は索引を使い、日本語と英数字で挙動が異なる。
 *
 * 出典（いずれも公式）:
 * - クエリの書き方 https://cybozu.dev/ja/kintone/docs/overview/query/
 *   「クエリで文字列検索する場合は単語検索です」
 * - データを検索する / キーワード入力時の注意事項
 *   https://jp.kintone.help/k/ja/search/search_details.html
 *   日本語・中国語: 「2文字以上の単語は、2文字以上のキーワードで検索する必要があります」
 *     （「日本語」は「日本」「本語」「日本語」でヒットし、「日」ではヒットしない）
 *   英数字: 「単語単位で検索されます」
 *     （「cybozu kintone2」は「cybozu」「kintone2」がそれぞれ1単語）
 *   記号: 「アンダースコア（_）、番号記号（#）、およびプラス（+）は、
 *     全角および半角共に単語の一部とみなされます」
 */

const LIKE_HINT =
  "kintoneの文字列検索は索引を使うため、素の部分一致ではありません。" +
  "日本語は2文字以上あれば途中の文字列でもヒットします" +
  "（「日本語」は「本語」でヒット、「日」ではヒットしません）。" +
  "英数字は単語まるごとの一致が必要で、「kintone2」は「kintone」ではヒットしません。" +
  "アンダースコア（_）・番号記号（#）・プラス（+）は単語の一部として扱われるため、" +
  "「cybozu_kintone」は「cybozu」ではヒットしません。";

const IN_HINT =
  "列挙した値のいずれかと完全に一致するレコードだけが対象です。" +
  "部分的に一致するものは含まれません。" +
  "文字列の一部で探したい場合はlikeを使いますが、" +
  "likeも英数字は単語まるごとの一致が必要です。";

const OPERATOR_HINTS: Partial<Record<QueryOperator, string>> = {
  like: LIKE_HINT,
  "not like": LIKE_HINT,
  in: IN_HINT,
  "not in": IN_HINT,
};

/**
 * 条件行に添える短い注意書き。全文はツールチップで見せる。
 * 「含む」と読めるのに部分一致しない、という食い違いに気づけるようにする。
 */
const LIKE_SHORT_HINT =
  "日本語は2文字以上で部分一致、英数字は単語まるごとの一致が必要です";
const IN_SHORT_HINT = "完全に一致する値だけが対象です（部分一致しません）";

const OPERATOR_SHORT_HINTS: Partial<Record<QueryOperator, string>> = {
  like: LIKE_SHORT_HINT,
  "not like": LIKE_SHORT_HINT,
  in: IN_SHORT_HINT,
  "not in": IN_SHORT_HINT,
};

/**
 * 指定した演算子の注意書きを返す。無ければnull。
 */
export function getOperatorHint(operator: QueryOperator): string | null {
  return OPERATOR_HINTS[operator] ?? null;
}

/**
 * 指定した演算子の短い注意書きを返す。無ければnull。
 */
export function getOperatorShortHint(operator: QueryOperator): string | null {
  return OPERATOR_SHORT_HINTS[operator] ?? null;
}
