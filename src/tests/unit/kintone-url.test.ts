import { describe, it, expect } from "vitest";
import { buildKintoneUrl, normalizeGuestSpaceId } from "@/utils/kintone-url";

describe("normalizeGuestSpaceId", () => {
  it("有効なIDはそのまま返す", () => {
    expect(normalizeGuestSpaceId("12")).toBe("12");
    expect(normalizeGuestSpaceId(12)).toBe("12");
  });

  it("空を意味する値はnullに寄せる", () => {
    expect(normalizeGuestSpaceId(null)).toBeNull();
    expect(normalizeGuestSpaceId(undefined)).toBeNull();
    expect(normalizeGuestSpaceId("")).toBeNull();
    expect(normalizeGuestSpaceId("   ")).toBeNull();
  });

  it('kintoneが返しうる文字列 "null" もnullとして扱う', () => {
    // AppDataTableが app.spaceId !== "null" を判定しているのと同じケース
    expect(normalizeGuestSpaceId("null")).toBeNull();
    expect(normalizeGuestSpaceId("undefined")).toBeNull();
  });
});

describe("buildKintoneUrl", () => {
  const SUB = "sample";

  it("スペースIDなしは通常の /k/v1/ を使う", () => {
    expect(buildKintoneUrl(SUB, "app/form/fields.json?app=1")).toBe(
      "https://sample.cybozu.com/k/v1/app/form/fields.json?app=1",
    );
  });

  it("スペースID指定時は /k/guest/{id}/v1/ を使う", () => {
    expect(buildKintoneUrl(SUB, "app/form/fields.json?app=1", "12")).toBe(
      "https://sample.cybozu.com/k/guest/12/v1/app/form/fields.json?app=1",
    );
  });

  it("レコード取得もゲストパスになる", () => {
    expect(buildKintoneUrl(SUB, "records.json?app=1", "7")).toBe(
      "https://sample.cybozu.com/k/guest/7/v1/records.json?app=1",
    );
  });

  it('spaceIdが "null" 相当なら通常パスにフォールバックする', () => {
    for (const empty of ["null", "", null, undefined]) {
      expect(buildKintoneUrl(SUB, "records.json?app=1", empty)).toBe(
        "https://sample.cybozu.com/k/v1/records.json?app=1",
      );
    }
  });

  it("先頭のスラッシュがあってもパスが二重にならない", () => {
    expect(buildKintoneUrl(SUB, "/records.json?app=1")).toBe(
      "https://sample.cybozu.com/k/v1/records.json?app=1",
    );
    expect(buildKintoneUrl(SUB, "/records.json?app=1", "3")).toBe(
      "https://sample.cybozu.com/k/guest/3/v1/records.json?app=1",
    );
  });

  it("アプリ一覧は通常パスのまま（ゲストスペースのアプリも含まれる）", () => {
    expect(buildKintoneUrl(SUB, "apps.json?limit=100&offset=0")).toBe(
      "https://sample.cybozu.com/k/v1/apps.json?limit=100&offset=0",
    );
  });
});
