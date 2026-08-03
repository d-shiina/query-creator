import { describe, it, expect } from "vitest";
import { getOperatorHint } from "@/utils/query-operator-hints";

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
