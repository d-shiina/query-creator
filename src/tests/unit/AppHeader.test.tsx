import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeader from "@/components/template/AppHeader";

function renderHeader(
  props: Partial<React.ComponentProps<typeof AppHeader>> = {},
) {
  const onShowHelp = vi.fn();
  render(
    <AppHeader
      breadcrumb={[{ label: "アプリ一覧" }]}
      onLogout={vi.fn()}
      {...props}
    />,
  );
  return { onShowHelp };
}

describe("AppHeader の使い方ボタン", () => {
  beforeEach(() => {
    Object.assign(window, {
      themeMode: {
        current: vi.fn(async () => "light"),
        toggle: vi.fn(async () => false),
        dark: vi.fn(),
        light: vi.fn(),
        system: vi.fn(async () => false),
      },
      electronWindow: {
        platform: "win32",
        isMaximized: vi.fn(async () => false),
        onMaximizeChange: () => () => undefined,
      },
    });
  });

  it("渡されなければ出さない", () => {
    renderHeader();

    expect(
      screen.queryByRole("button", { name: "使い方" }),
    ).not.toBeInTheDocument();
  });

  it("押すと案内を開く", async () => {
    const onShowHelp = vi.fn();
    render(
      <AppHeader
        breadcrumb={[{ label: "アプリ一覧" }]}
        onShowHelp={onShowHelp}
        onLogout={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "使い方" }));

    expect(onShowHelp).toHaveBeenCalled();
  });

  it("ログアウトの並びに置く（画面が変わっても位置が動かない）", () => {
    render(
      <AppHeader
        breadcrumb={[{ label: "アプリ一覧" }]}
        onShowHelp={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    const help = screen.getByRole("button", { name: "使い方" });
    const logout = screen.getByRole("button", { name: /ログアウト/ });

    expect(help.parentElement).toBe(logout.parentElement);
  });
});
