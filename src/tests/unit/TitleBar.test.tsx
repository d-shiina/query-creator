import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import React from "react";
import TitleBar from "@/components/template/TitleBar";

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

describe("TitleBar", () => {
  beforeEach(() => {
    stubElectronWindow();
  });

  test("Windowsではウィンドウ操作ボタンを表示する", () => {
    render(<TitleBar />);

    expect(screen.getByRole("button", { name: "最小化" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "最大化" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  test("ボタンがドラッグ領域から除外されている", () => {
    render(<TitleBar />);

    expect(screen.getByRole("button", { name: "閉じる" })).toHaveClass(
      "no-drag",
    );
  });

  test.each([
    ["最小化", "minimize"],
    ["最大化", "maximize"],
    ["閉じる", "close"],
  ] as const)("%s ボタンが %s を呼ぶ", async (label, method) => {
    render(<TitleBar />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(window.electronWindow[method]).toHaveBeenCalledTimes(1);
  });

  test("最大化されたら「元のサイズに戻す」に切り替わる", async () => {
    const { emitMaximizeChange } = stubElectronWindow();
    render(<TitleBar />);

    act(() => emitMaximizeChange(true));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "元のサイズに戻す" }),
      ).toBeInTheDocument();
    });
  });

  test("macOSでは信号機ボタンと重ならないよう独自ボタンを出さない", () => {
    stubElectronWindow({ platform: "darwin" });
    render(<TitleBar />);

    expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();
  });
});
