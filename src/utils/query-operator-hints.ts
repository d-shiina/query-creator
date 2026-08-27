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
 *   記号: 「アンダースコア（_）、番号記号（#）、およびプラス（+）は、
 *     全角および半角共に単語の一部とみなされます」
 *
 * 英数字については、ヘルプの表現は「単語単位」だが、実際には単語の先頭からの
 * 一致でヒットする。ここでは実挙動に合わせて「単語の先頭からのみ一致」と書き、
 * 「SalesReport」を例に、先頭の「Sales」では見つかり、途中の「Report」では
 * 見つからないことを示している。
 */

/**
 * 条件行に添えるヒント。
 * 要点（summary）と具体例（example）に分けて、読み手が挙動を思い浮かべられるようにする。
 */
export type OperatorTip = {
  summary: string;
  example: string;
};

const LIKE_TIP: OperatorTip = {
  summary:
    "日本語は2文字以上で途中も一致、英数字は単語の先頭からのみ一致します。",
  example:
    "例:「SalesReport」は「Sales」で見つかりますが、「Report」では見つかりません。",
};

const IN_TIP: OperatorTip = {
  summary: "並べた値と完全に一致するものだけが対象で、部分一致はしません。",
  example:
    "例:「東京都」と登録された値は「東京」では見つかりません。一部だけで探すならlikeを使います。",
};

const OPERATOR_TIPS: Partial<Record<QueryOperator, OperatorTip>> = {
  like: LIKE_TIP,
  "not like": LIKE_TIP,
  in: IN_TIP,
  "not in": IN_TIP,
};

const LIKE_HINT =
  "kintoneの文字列検索は索引を使うため、素の部分一致ではありません。" +
  "日本語は2文字以上あれば途中の文字列でもヒットします" +
  "（「日本語」は「本語」でヒット、「日」ではヒットしません）。" +
  "英数字は単語の先頭からの一致だけがヒットします" +
  "（「SalesReport」は「Sales」でヒット、「Report」ではヒットしません）。" +
  "アンダースコア（_）・番号記号（#）・プラス（+）は単語の一部として扱われるため、" +
  "「cybozu_kintone」は途中の「kintone」ではヒットしません。";

const IN_HINT =
  "列挙した値のいずれかと完全に一致するレコードだけが対象です。" +
  "部分的に一致するものは含まれません。" +
  "文字列の一部で探したい場合はlikeを使いますが、" +
  "likeも英数字は単語の先頭からの一致が必要です。";

const OPERATOR_HINTS: Partial<Record<QueryOperator, string>> = {
  like: LIKE_HINT,
  "not like": LIKE_HINT,
  in: IN_HINT,
  "not in": IN_HINT,
};

/**
 * 指定した演算子の注意書きを返す。無ければnull。
 */
export function getOperatorHint(operator: QueryOperator): string | null {
  return OPERATOR_HINTS[operator] ?? null;
}

/**
 * 指定した演算子のヒントを返す。無ければnull。
 */
export function getOperatorTip(operator: QueryOperator): OperatorTip | null {
  return OPERATOR_TIPS[operator] ?? null;
}

/**
 * 指定した演算子の短い注意書きを1行にまとめて返す。無ければnull。
 * 読み上げやtitle属性など、1行しか置けない場所で使う。
 */
export function getOperatorShortHint(operator: QueryOperator): string | null {
  const tip = OPERATOR_TIPS[operator];
  if (!tip) return null;
  return `${tip.summary}${tip.example}`;
}
