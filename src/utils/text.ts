/**
 * HTMLタグを除去する
 * @param text 元のテキスト
 * @returns HTMLタグが除去されたテキスト
 */
export function stripHtmlTags(text: string | null | undefined): string {
  if (!text) return '';
  
  // HTMLタグを除去
  return text.replace(/<[^>]*>/g, '');
}

/**
 * テキストを指定した長さで切り詰め、省略記号を追加する
 * @param text 元のテキスト
 * @param maxLength 最大文字数
 * @param suffix 省略記号（デフォルト: '...'）
 * @returns 切り詰められたテキスト
 */
export function truncateText(text: string | null | undefined, maxLength: number, suffix: string = '...'): string {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 改行を含むテキストを一行にして切り詰める
 * @param text 元のテキスト
 * @param maxLength 最大文字数
 * @param suffix 省略記号（デフォルト: '...'）
 * @returns 切り詰められたテキスト
 */
export function truncateMultilineText(text: string | null | undefined, maxLength: number, suffix: string = '...'): string {
  if (!text) return '';
  
  // 改行文字を空白に置換して一行にする
  const singleLine = text.replace(/\r?\n|\r/g, ' ').trim();
  
  return truncateText(singleLine, maxLength, suffix);
}

/**
 * HTMLタグを除去し、改行を含むテキストを一行にして切り詰める
 * @param text 元のテキスト
 * @param maxLength 最大文字数
 * @param suffix 省略記号（デフォルト: '...'）
 * @returns HTMLタグが除去され、切り詰められたテキスト
 */
export function cleanAndTruncateText(text: string | null | undefined, maxLength: number, suffix: string = '...'): string {
  if (!text) return '';
  
  // HTMLタグを除去
  const cleanText = stripHtmlTags(text);
  
  // 改行文字を空白に置換して一行にする
  const singleLine = cleanText.replace(/\r?\n|\r/g, ' ').trim();
  
  // 連続する空白を一つの空白に置換
  const normalizedText = singleLine.replace(/\s+/g, ' ');
  
  return truncateText(normalizedText, maxLength, suffix);
}
