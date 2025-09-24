import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeKintoneAPI } from "./kintone/kintone-context";

// デフォルトエクスポートを追加
export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeKintoneAPI();
}

// 名前付きエクスポートも追加（念のため）
export { exposeContexts };
