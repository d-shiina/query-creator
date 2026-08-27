import { describe, expect, test } from "vitest";
import { orderRecordColumns } from "@/utils/kintone-record-columns";

const fields = [
  { code: "備考", type: "MULTI_LINE_TEXT" },
  { code: "レコード番号", type: "RECORD_NUMBER" },
  { code: "更新者", type: "MODIFIER" },
  { code: "作成者", type: "CREATOR" },
  { code: "郵便番号", type: "SINGLE_LINE_TEXT" },
  { code: "部署名", type: "SINGLE_LINE_TEXT" },
];

describe("orderRecordColumns", () => {
  test("識別子 → アプリ固有 → 付帯情報 の順に並べる", () => {
    const codes = [
      "備考",
      "レコード番号",
      "更新者",
      "作成者",
      "郵便番号",
      "$revision",
      "部署名",
    ];

    expect(orderRecordColumns(codes, fields)).toEqual([
      "レコード番号",
      "備考",
      "郵便番号",
      "部署名",
      "作成者",
      "更新者",
      "$revision",
    ]);
  });

  test("$id もレコードの識別子として先頭に置く", () => {
    expect(orderRecordColumns(["郵便番号", "$id"], fields)[0]).toBe("$id");
  });

  test("フィールド一覧にないコードも落とさず末尾に残す", () => {
    const ordered = orderRecordColumns(["未知フィールド", "郵便番号"], fields);

    expect(ordered).toEqual(["郵便番号", "未知フィールド"]);
  });

  test("元の配列を書き換えない", () => {
    const codes = ["備考", "レコード番号"];
    orderRecordColumns(codes, fields);

    expect(codes).toEqual(["備考", "レコード番号"]);
  });
});
