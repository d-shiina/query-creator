/**
 * レコード一覧の列順を決める。
 *
 * kintoneのレスポンスはフィールドコードをキーにしたオブジェクトなので、
 * そのままキー順に並べると「備考が一番左」のような、意味のない順序になる。
 * 読む側の関心は 識別子 → アプリ固有の項目 → 付帯情報 の順なので、その3層に分けて並べ直す。
 */

/**
 * レコードそのものではなく、作成・更新の記録にあたるフィールド。
 * 並びはフィールド一覧の順ではなく「作成 → 更新」で固定する。
 */
const METADATA_FIELD_ORDER = [
  "CREATOR",
  "CREATED_TIME",
  "MODIFIER",
  "UPDATED_TIME",
] as const;
const METADATA_FIELD_TYPES = new Set<string>(METADATA_FIELD_ORDER);

const IDENTIFIER = 0;
const APP_FIELD = 1;
const METADATA = 2;

export function orderRecordColumns(
  codes: string[],
  fields: ReadonlyArray<{ code: string; type?: string }>,
): string[] {
  const typeOf = new Map(fields.map((field) => [field.code, field.type]));
  // 同じ層の中では、フィールド選択の並びと揃える
  const fieldOrder = new Map(fields.map((field, index) => [field.code, index]));

  // $revision は付帯情報の最後に置く
  const metadataOrderOf = (code: string): number => {
    const type = typeOf.get(code);
    const index = METADATA_FIELD_ORDER.indexOf(
      type as (typeof METADATA_FIELD_ORDER)[number],
    );
    return index === -1 ? METADATA_FIELD_ORDER.length : index;
  };

  const layerOf = (code: string): number => {
    const type = typeOf.get(code);
    if (code === "$id" || type === "RECORD_NUMBER") return IDENTIFIER;
    if (code === "$revision" || (type && METADATA_FIELD_TYPES.has(type))) {
      return METADATA;
    }
    return APP_FIELD;
  };

  return [...codes].sort((a, b) => {
    const byLayer = layerOf(a) - layerOf(b);
    if (byLayer !== 0) return byLayer;

    if (layerOf(a) === METADATA) {
      const orderA = metadataOrderOf(a);
      const orderB = metadataOrderOf(b);
      if (orderA !== orderB) return orderA - orderB;
    }

    const orderA = fieldOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const orderB = fieldOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;

    return a.localeCompare(b);
  });
}
