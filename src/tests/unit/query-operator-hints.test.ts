import { describe, expect, test } from "vitest";
import {
  getOperatorHint,
  getOperatorShortHint,
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
    expect(hint).toContain("英数字は単語まるごと");
  });

  test("likeの説明は公式の例をそのまま示す", () => {
    const hint = getOperatorHint("like") ?? "";

    // 日本語は途中の2文字でヒットする
    expect(hint).toContain("「日本語」は「本語」でヒット");
    // 英数字は単語の一部では当たらない
    expect(hint).toContain("「kintone2」は「kintone」ではヒットしません");
    // 記号は単語を区切らない
    expect(hint).toContain("「cybozu_kintone」は「cybozu」ではヒットしません");
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

describe("getOperatorShortHint", () => {
  test("行内には要点だけを1行で出す", () => {
    expect(getOperatorShortHint("like")).toBe(
      "日本語は2文字以上で部分一致、英数字は単語まるごとの一致が必要です",
    );
    expect(getOperatorShortHint("in")).toContain("部分一致しません");
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
