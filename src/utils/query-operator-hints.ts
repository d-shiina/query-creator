import type { QueryOperator } from "@/types/kintone";

/**
 * 演算子ごとの注意書き。
 *
 * kintoneの文字列検索は「単語検索」で、SQLのLIKEのような素の部分一致ではない。
 * そのためlikeを指定しても完全一致しかヒットしないように見えることがある。
 * ラベルの「文字列を含む」だけでは期待とずれるため、UI側で補足する。
 *
 * 参考: kintoneのクエリ仕様「クエリで文字列検索する場合は単語検索です」
 */
const OPERATOR_HINTS: Partial<Record<QueryOperator, string>> = {
  like: "kintoneの検索は単語単位です。英数字は単語全体で指定する必要があり（例: 「test123」は「test」ではヒットしません）、日本語は2文字以上が必要です。",
  "not like":
    "kintoneの検索は単語単位です。英数字は単語全体で指定する必要があり（例: 「test123」は「test」ではヒットしません）、日本語は2文字以上が必要です。",
  in: "完全一致で判定されます。部分一致で探したい場合はlikeを使ってください。",
  "not in":
    "完全一致で判定されます。部分一致で探したい場合はnot likeを使ってください。",
};

/**
 * 指定した演算子の注意書きを返す。無ければnull。
 */
export function getOperatorHint(operator: QueryOperator): string | null {
  return OPERATOR_HINTS[operator] ?? null;
}
