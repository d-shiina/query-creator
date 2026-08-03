import { describe, it, expect } from "vitest";
import {
  formatQueryForOutput,
  QUERY_OUTPUT_FORMATS,
  type QueryOutputFormat,
} from "@/utils/query-format";

// generateQuery が返す想定の「素のkintoneクエリ」
const PLAIN_QUERY = '会社名 = "サイボウズ" and 数値 > 10';
// 値に " を含むケース（kintoneクエリ構文としてのエスケープ済み）
const QUERY_WITH_QUOTE = '備考 like "He said \\"hi\\""';

describe("formatQueryForOutput", () => {
  it("python形式は素のクエリをそのまま返す", () => {
    expect(formatQueryForOutput(PLAIN_QUERY, "python")).toBe(PLAIN_QUERY);
  });

  it("python形式はkintoneクエリ構文のバックスラッシュを増やさない", () => {
    expect(formatQueryForOutput(QUERY_WITH_QUOTE, "python")).toBe(
      QUERY_WITH_QUOTE,
    );
  });

  it("vbs形式は \" をJSONエスケープする", () => {
    expect(formatQueryForOutput(PLAIN_QUERY, "vbs")).toBe(
      '会社名 = \\"サイボウズ\\" and 数値 > 10',
    );
  });

  it("vbs形式は既存のバックスラッシュもJSONエスケープする", () => {
    expect(formatQueryForOutput(QUERY_WITH_QUOTE, "vbs")).toBe(
      '備考 like \\"He said \\\\\\"hi\\\\\\"\\"',
    );
  });

  it("vbs形式の出力はJSON文字列として元のクエリに復元できる", () => {
    for (const query of [PLAIN_QUERY, QUERY_WITH_QUOTE]) {
      const escaped = formatQueryForOutput(query, "vbs");
      expect(JSON.parse(`"${escaped}"`)).toBe(query);
    }
  });

  it("空文字・null・undefined は空文字を返す", () => {
    const formats: QueryOutputFormat[] = ["vbs", "python"];
    for (const format of formats) {
      expect(formatQueryForOutput("", format)).toBe("");
      expect(formatQueryForOutput(null, format)).toBe("");
      expect(formatQueryForOutput(undefined, format)).toBe("");
    }
  });
});

// VBSノードで実際に動作確認済みの実例（in演算子）
describe("実運用で確認済みのケース: Title in (\"40\")", () => {
  const RAW = 'Title in ("40")';

  it("vbs形式は実際にVBSノードで動いている表記を再現する", () => {
    expect(formatQueryForOutput(RAW, "vbs")).toBe('Title in (\\"40\\")');
  });

  it("python形式はバックスラッシュを含まない", () => {
    const output = formatQueryForOutput(RAW, "python");
    expect(output).toBe('Title in ("40")');
    expect(output).not.toContain("\\");
  });
});

describe("QUERY_OUTPUT_FORMATS", () => {
  it("vbsとpythonの両方を選択肢として持つ", () => {
    expect(QUERY_OUTPUT_FORMATS.map((f) => f.value)).toEqual([
      "vbs",
      "python",
    ]);
  });
});
