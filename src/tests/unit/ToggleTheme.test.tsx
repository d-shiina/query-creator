import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import ToggleTheme from "@/components/ToggleTheme";
import React from "react";

// themeMode はプリロード（contextBridge）が注入するため jsdom には存在しない。
// スタブを置かないとマウント時の useEffect が未処理の rejection になり、
// テスト自体は通ってもテスト実行が失敗する。
function stubThemeMode(current: "dark" | "light" = "light") {
  window.themeMode = {
    current: vi.fn().mockResolvedValue(current),
    toggle: vi.fn().mockResolvedValue(current === "dark"),
    dark: vi.fn().mockResolvedValue(undefined),
    light: vi.fn().mockResolvedValue(undefined),
    system: vi.fn().mockResolvedValue(current === "dark"),
  } as unknown as Window["themeMode"];
}

beforeEach(() => {
  stubThemeMode();
});

afterEach(() => {
  delete (window as Partial<Window>).themeMode;
  localStorage.clear();
});

test("renders ToggleTheme", () => {
  const { getByRole } = render(<ToggleTheme />);
  const isButton = getByRole("button");

  expect(isButton).toBeInTheDocument();
});

test("has icon", () => {
  const { getByRole } = render(<ToggleTheme />);
  const button = getByRole("button");
  const icon = button.querySelector("svg");

  expect(icon).toBeInTheDocument();
});

test("is moon icon", () => {
  const svgIconClassName: string = "lucide-moon";
  const { getByRole } = render(<ToggleTheme />);
  const svg = getByRole("button").querySelector("svg");

  expect(svg?.classList).toContain(svgIconClassName);
});

test("システムがダークなら太陽アイコンに切り替わる", async () => {
  stubThemeMode("dark");
  const { getByRole } = render(<ToggleTheme />);

  await waitFor(() => {
    const svg = getByRole("button").querySelector("svg");
    expect(svg?.classList).toContain("lucide-sun");
  });
});
