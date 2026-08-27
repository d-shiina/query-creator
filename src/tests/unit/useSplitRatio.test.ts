import { describe, expect, test } from "vitest";
import {
  clampSplitRatio,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
} from "@/hooks/useSplitRatio";

describe("clampSplitRatio", () => {
  test("範囲内の値はそのまま返す", () => {
    expect(clampSplitRatio(46)).toBe(46);
  });

  test("片側が潰れる比率は下限・上限で止める", () => {
    expect(clampSplitRatio(2)).toBe(MIN_SPLIT_RATIO);
    expect(clampSplitRatio(98)).toBe(MAX_SPLIT_RATIO);
    expect(clampSplitRatio(-30)).toBe(MIN_SPLIT_RATIO);
  });

  test("数値にならない値でもレイアウトを壊さない", () => {
    expect(clampSplitRatio(Number.NaN)).toBe(MIN_SPLIT_RATIO);
    expect(clampSplitRatio(Number.POSITIVE_INFINITY)).toBe(MIN_SPLIT_RATIO);
  });
});
