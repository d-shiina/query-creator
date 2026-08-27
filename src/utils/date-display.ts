import { format, formatDistanceToNow, isValid } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 一覧では「3日前」、詳細では「2026/08/27 14:03」と出し分ける。
 * 一覧で見たいのは新しいかどうかだけで、正確な日時は詳細で足りる。
 */

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

/** 「3日前」。日時が無ければ null（呼び出し側で「-」にする） */
export function formatRelativeDate(
  value: string | null | undefined,
): string | null {
  const date = parse(value);
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: ja });
}

/** 「2026/08/27 14:03」。日時が無ければ null */
export function formatAbsoluteDateTime(
  value: string | null | undefined,
): string | null {
  const date = parse(value);
  if (!date) return null;
  return format(date, "yyyy/MM/dd HH:mm", { locale: ja });
}
