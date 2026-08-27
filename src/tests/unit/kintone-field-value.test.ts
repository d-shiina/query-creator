import { describe, expect, test } from "vitest";
import { formatFieldValue } from "@/utils/kintone-field-value";

describe("formatFieldValue", () => {
  test("文字列・数値はそのまま出す", () => {
    expect(formatFieldValue({ type: "SINGLE_LINE_TEXT", value: "案件A" })).toBe(
      "案件A",
    );
    expect(formatFieldValue({ type: "NUMBER", value: "1200" })).toBe("1200");
  });

  test("作成者・更新者は単一オブジェクトなので名前だけ出す", () => {
    const creator = {
      type: "CREATOR",
      value: { code: "hashizume-kento", name: "橋爪研人" },
    };

    expect(formatFieldValue(creator)).toBe("橋爪研人");
  });

  test("ユーザー選択は名前をカンマで並べる", () => {
    const users = {
      type: "USER_SELECT",
      value: [
        { code: "a", name: "山田" },
        { code: "b", name: "田中" },
      ],
    };

    expect(formatFieldValue(users)).toBe("山田, 田中");
  });

  test("名前がなければコードで代替する", () => {
    expect(formatFieldValue({ type: "CREATOR", value: { code: "a" } })).toBe(
      "a",
    );
  });

  test("チェックボックスなど素の配列はそのまま並べる", () => {
    expect(
      formatFieldValue({ type: "CHECK_BOX", value: ["営業", "開発"] }),
    ).toBe("営業, 開発");
  });

  test("添付ファイルはファイル名を並べる", () => {
    const files = {
      type: "FILE",
      value: [{ name: "見積.pdf" }, { name: "図面.png" }],
    };

    expect(formatFieldValue(files)).toBe("見積.pdf, 図面.png");
  });

  test("サブテーブルは行数で示す（中身を並べても読めないため）", () => {
    const subtable = {
      type: "SUBTABLE",
      value: [{ id: "1", value: {} }, { id: "2", value: {} }],
    };

    expect(formatFieldValue(subtable)).toBe("2行");
  });

  test("空の値は空文字にする", () => {
    expect(formatFieldValue({ type: "SINGLE_LINE_TEXT", value: "" })).toBe("");
    expect(formatFieldValue({ type: "USER_SELECT", value: [] })).toBe("");
    expect(formatFieldValue({ type: "DATE", value: null })).toBe("");
    expect(formatFieldValue(null)).toBe("");
    expect(formatFieldValue(undefined)).toBe("");
  });

  test("想定外の形でもJSONを表に出さずに済む場合は名前を拾う", () => {
    expect(formatFieldValue({ name: "橋爪研人", code: "x" })).toBe("橋爪研人");
  });
});
