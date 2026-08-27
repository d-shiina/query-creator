import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import React from "react";
import WindowControls, {
  titleBarInsetStyle,
} from "@/components/template/WindowControls";

type MaximizeListener = (isMaximized: boolean) => void;

function stubElectronWindow(
  overrides: Partial<Window["electronWindow"]> = {},
): { emitMaximizeChange: MaximizeListener } {
  let listener: MaximizeListener = () => {};

  const api = {
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),
    onMaximizeChange: vi.fn((callback: MaximizeListener) => {
      listener = callback;
      return () => {
        listener = () => {};
      };
    }),
    platform: "win32" as NodeJS.Platform,
    toggleDevTools: vi.fn().mockResolvedValue(undefined),
    openDevTools: vi.fn().mockResolvedValue(undefined),
    closeDevTools: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  window.electronWindow = api as unknown as Window["electronWindow"];

  return { emitMaximizeChange: (isMaximized) => listener(isMaximized) };
}

afterEach(() => {
  delete (window as Partial<Window>).electronWindow;
  vi.restoreAllMocks();
});

describe("WindowControls", () => {
  beforeEach(() => {
    stubElectronWindow();
  });

  test("Windowsではウィンドウ操作ボタンを表示する", () => {
    render(<WindowControls />);

    expect(screen.getByRole("button", { name: "最小化" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "最大化" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  test("ボタンがドラッグ領域から除外されている", () => {
    render(<WindowControls />);

    expect(screen.getByRole("button", { name: "閉じる" })).toHaveClass(
      "no-drag",
    );
  });

  test.each([
    ["最小化", "minimize"],
    ["最大化", "maximize"],
    ["閉じる", "close"],
  ] as const)("%s ボタンが %s を呼ぶ", async (label, method) => {
    render(<WindowControls />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(window.electronWindow[method]).toHaveBeenCalledTimes(1);
  });

  test("最大化されたら「元のサイズに戻す」に切り替わる", async () => {
    const { emitMaximizeChange } = stubElectronWindow();
    render(<WindowControls />);

    act(() => emitMaximizeChange(true));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "元のサイズに戻す" }),
      ).toBeInTheDocument();
    });
  });

  test("macOSでは信号機ボタンがあるので独自ボタンを出さない", () => {
    stubElectronWindow({ platform: "darwin" });
    const { container } = render(<WindowControls />);

    expect(container).toBeEmptyDOMElement();
  });

  test("Windowsではボタンがヘッダーの中に並ぶので余白は要らない", () => {
    expect(titleBarInsetStyle()).toEqual({});
  });

  test("macOSは信号機ボタンのぶんだけ左を空ける", () => {
    stubElectronWindow({ platform: "darwin" });

    expect(titleBarInsetStyle()).toEqual({ paddingLeft: 78 });
  });
});
