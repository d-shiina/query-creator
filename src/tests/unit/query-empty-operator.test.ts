import { describe, expect, it } from "vitest";
import { queryUtils } from "@/pages/QueryGeneratorPage";
import { KintoneField, QueryCondition } from "@/types/kintone";
import { fieldTypeOperators } from "@/constants/kintone-query-constants";

/**
 * kintoneの空判定は `is empty` / `is not empty`。
 * `is not null` はCB_VA01で弾かれるため、生成側が null を出さないことを固定する。
 * https://cybozu.dev/ja/kintone/docs/overview/query/
 */

const fields: KintoneField[] = [
  { code: "詳細", label: "詳細", type: "MULTI_LINE_TEXT" },
  { code: "会社名", label: "会社名", type: "SINGLE_LINE_TEXT" },
];

const options = { sortField: "none", sortDirection: "asc" as const };

function build(conditions: QueryCondition[]) {
  return queryUtils.generateQuery(conditions, fields, options);
}

describe("空判定のクエリ", () => {
  it("「空でない」は is not empty になる", () => {
    expect(build([{ field: "詳細", operator: "is not", value: "" }])).toBe(
      "詳細 is not empty",
    );
  });

  it("「空」は is empty になる", () => {
    expect(build([{ field: "詳細", operator: "is", value: "" }])).toBe(
      "詳細 is empty",
    );
  });

  it("値を伴う条件と混ぜても壊れない", () => {
    expect(
      build([
        { field: "詳細", operator: "is not", value: "" },
        {
          field: "会社名",
          operator: "=",
          value: "サイボウズ",
          logicalOperator: "and",
        },
      ]),
    ).toBe('詳細 is not empty and 会社名 = "サイボウズ"');
  });

  it("空判定を出せるのは複数行文字列・リッチエディター・添付ファイルだけ", () => {
    for (const type of ["MULTI_LINE_TEXT", "RICH_TEXT", "FILE"]) {
      expect(fieldTypeOperators[type]).toContain("is");
      expect(fieldTypeOperators[type]).toContain("is not");
    }
    for (const type of ["SINGLE_LINE_TEXT", "NUMBER", "DATE", "DROP_DOWN"]) {
      expect(fieldTypeOperators[type]).not.toContain("is");
      expect(fieldTypeOperators[type]).not.toContain("is not");
    }
  });
});
