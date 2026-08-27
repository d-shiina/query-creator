import { describe, expect, test } from "vitest";
import {
  getOperatorHint,
  getOperatorShortHint,
  getOperatorTip,
} from "@/utils/query-operator-hints";

/**
 * 文言の根拠は公式ドキュメント。
 * - https://cybozu.dev/ja/kintone/docs/overview/query/
 * - https://jp.kintone.help/k/ja/search/search_details.html
 */
describe("getOperatorHint", () => {
  test("likeは日本語と英数字で挙動が違うことを両方伝える", () => {
    const hint = getOperatorHint("like");

    expect(hint).toContain("日本語は2文字以上");
    expect(hint).toContain("英数字は単語の先頭から");
  });

  test("likeの説明は具体例をそのまま示す", () => {
    const hint = getOperatorHint("like") ?? "";

    // 日本語は途中の2文字でヒットする
    expect(hint).toContain("「日本語」は「本語」でヒット");
    // 英数字は先頭でヒットし、途中では当たらない
    expect(hint).toContain("「SalesReport」は「Sales」でヒット");
    expect(hint).toContain("「Report」ではヒットしません");
    // 記号は単語を区切らない
    expect(hint).toContain(
      "「cybozu_kintone」は途中の「kintone」ではヒットしません",
    );
  });

  test("not likeにもlikeと同じ説明を返す", () => {
    expect(getOperatorHint("not like")).toBe(getOperatorHint("like"));
  });

  test("inは完全一致であることを伝え、部分一致の代替に触れる", () => {
    const hint = getOperatorHint("in") ?? "";

    expect(hint).toContain("完全に一致");
    expect(hint).toContain("like");
  });

  test("誤解の余地がない演算子には注意書きを持たせない", () => {
    expect(getOperatorHint("=")).toBeNull();
    expect(getOperatorHint(">=")).toBeNull();
    expect(getOperatorHint("is")).toBeNull();
  });
});

describe("getOperatorTip", () => {
  test("行内のヒントは要点と具体例に分かれている", () => {
    const tip = getOperatorTip("like");

    expect(tip?.summary).toBe(
      "日本語は2文字以上で途中も一致、英数字は単語の先頭からのみ一致します。",
    );
    expect(tip?.example).toBe(
      "例:「SalesReport」は「Sales」で見つかりますが、「Report」では見つかりません。",
    );
  });

  test("inのヒントは完全一致であることと代わりの探し方を示す", () => {
    const tip = getOperatorTip("in");

    expect(tip?.summary).toContain("部分一致はしません");
    expect(tip?.example).toContain("like");
  });

  test("not inにもinと同じヒントを返す", () => {
    expect(getOperatorTip("not in")).toEqual(getOperatorTip("in"));
  });

  test("誤解の余地がない演算子には出さない", () => {
    expect(getOperatorTip("=")).toBeNull();
    expect(getOperatorTip("is not")).toBeNull();
  });
});

describe("getOperatorShortHint", () => {
  test("1行しか置けない場所向けに要点と具体例をつなげる", () => {
    const tip = getOperatorTip("like");

    expect(getOperatorShortHint("like")).toBe(`${tip?.summary}${tip?.example}`);
  });

  test("短い注意書きは全文より短い", () => {
    const short = getOperatorShortHint("like") ?? "";
    const full = getOperatorHint("like") ?? "";

    expect(short.length).toBeLessThan(full.length);
  });

  test("誤解の余地がない演算子には出さない", () => {
    expect(getOperatorShortHint("=")).toBeNull();
    expect(getOperatorShortHint("is not")).toBeNull();
  });
});
