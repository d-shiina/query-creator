import { describe, it, expect, test } from "vitest";
import {
  getOperatorHint,
  getOperatorShortHint,
} from "@/utils/query-operator-hints";

describe("getOperatorHint", () => {
  it("likeには単語検索の注意書きを返す", () => {
    const hint = getOperatorHint("like");
    expect(hint).toContain("単語単位");
  });

  it("not likeにも同じ注意書きを返す", () => {
    expect(getOperatorHint("not like")).toContain("単語単位");
  });

  it("in / not in には完全一致であることを示す", () => {
    expect(getOperatorHint("in")).toContain("完全一致");
    expect(getOperatorHint("not in")).toContain("完全一致");
  });

  it("注意書きが不要な演算子はnullを返す", () => {
    expect(getOperatorHint("=")).toBeNull();
    expect(getOperatorHint("!=")).toBeNull();
    expect(getOperatorHint(">")).toBeNull();
    expect(getOperatorHint("is")).toBeNull();
  });
});

describe("getOperatorShortHint", () => {
  test("部分一致だと誤解しやすい演算子には行内の注意書きを返す", () => {
    expect(getOperatorShortHint("like")).toContain("部分一致ではありません");
    expect(getOperatorShortHint("not like")).toContain(
      "部分一致ではありません",
    );
    expect(getOperatorShortHint("in")).toContain("完全一致");
    expect(getOperatorShortHint("not in")).toContain("完全一致");
  });

  test("誤解の余地がない演算子には出さない", () => {
    expect(getOperatorShortHint("=")).toBeNull();
    expect(getOperatorShortHint(">=")).toBeNull();
    expect(getOperatorShortHint("is")).toBeNull();
  });
});
