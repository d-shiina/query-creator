/**
 * kintoneのレコード値を一覧表示できる文字列に変換する。
 *
 * kintoneはフィールド種別ごとに違う形で値を返す（文字列・配列・オブジェクト）。
 * オブジェクトをそのままJSONで出すとセルが読めなくなるので、
 * 種別ごとに人が読める表現へ落とす。
 */

/**
 * ユーザー・組織・グループは {code, name} の形で返る。
 * 一覧では名前だけ読めればよいので、name → code の順に拾う。
 */
export function formatEntityValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);

  const entity = value as { name?: unknown; code?: unknown };
  if (typeof entity.name === "string" && entity.name) return entity.name;
  if (typeof entity.code === "string" && entity.code) return entity.code;

  return JSON.stringify(value);
}

export function formatFieldValue(fieldData: unknown): string {
  if (!fieldData) return "";

  if (
    typeof fieldData === "object" &&
    fieldData !== null &&
    "value" in fieldData
  ) {
    const data = fieldData as { value: unknown; type?: string };
    const { value } = data;

    if (value == null) return "";

    // 添付ファイルはファイル名を並べる
    if (data.type === "FILE" && Array.isArray(value)) {
      return value
        .map((file: { name?: string }) => file.name || "")
        .filter(Boolean)
        .join(", ");
    }

    // サブテーブルは中身を並べても読めないので行数だけ示す
    if (data.type === "SUBTABLE" && Array.isArray(value)) {
      return `${value.length}行`;
    }

    // ユーザー選択・組織選択・チェックボックスなどの複数値
    if (Array.isArray(value)) {
      return value.map(formatEntityValue).filter(Boolean).join(", ");
    }

    // 作成者・更新者は配列ではなく単一のオブジェクトで返る
    if (typeof value === "object") {
      return formatEntityValue(value);
    }

    return String(value);
  }

  if (Array.isArray(fieldData)) {
    return fieldData.map(formatEntityValue).filter(Boolean).join(", ");
  }

  if (typeof fieldData === "object") {
    return formatEntityValue(fieldData);
  }

  return String(fieldData);
}
