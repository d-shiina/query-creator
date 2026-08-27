import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecentApps,
  getRecentAppIds,
  recordAppOpened,
} from "@/utils/recent-apps";

describe("recent-apps", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("開いた順（新しい順）に並べる", () => {
    recordAppOpened("1");
    recordAppOpened("2");

    expect(getRecentAppIds()).toEqual(["2", "1"]);
  });

  it("同じアプリを開き直しても重複させず、先頭に出す", () => {
    recordAppOpened("1");
    recordAppOpened("2");
    recordAppOpened("1");

    expect(getRecentAppIds()).toEqual(["1", "2"]);
  });

  it("20件を超えたら古いものから捨てる", () => {
    for (let i = 1; i <= 25; i += 1) {
      recordAppOpened(String(i));
    }

    const ids = getRecentAppIds();
    expect(ids).toHaveLength(20);
    expect(ids[0]).toBe("25");
    expect(ids).not.toContain("5");
  });

  it("記録後の並びをそのまま返す", () => {
    recordAppOpened("1");

    expect(recordAppOpened("2")).toEqual(["2", "1"]);
  });

  it("壊れた保存値は空として扱う", () => {
    localStorage.setItem("kintone-recent-apps", "{壊れている");

    expect(getRecentAppIds()).toEqual([]);
  });

  it("消せる", () => {
    recordAppOpened("1");
    clearRecentApps();

    expect(getRecentAppIds()).toEqual([]);
  });
});
