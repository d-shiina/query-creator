import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeKintoneAPI } from "./kintone/kintone-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeKintoneAPI();
}
