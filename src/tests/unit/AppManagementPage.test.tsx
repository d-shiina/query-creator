import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppManagementPage from "@/pages/AppManagementPage";
import { ToastProvider } from "@/components/ui/toast";

const apps = [
  { appId: "1", name: "案件管理", modifiedAt: "2026-08-26T10:00:00Z" },
  { appId: "2", name: "受注管理", modifiedAt: "2026-08-20T10:00:00Z" },
  { appId: "3", name: "契約書管理", modifiedAt: "2026-08-01T10:00:00Z" },
];

function renderPage() {
  const onSelectApp = vi.fn();
  render(
    <ToastProvider>
      <AppManagementPage
        auth={{ subdomain: "example", username: "u", password: "p" }}
        onSelectApp={onSelectApp}
        onLogout={vi.fn()}
      />
    </ToastProvider>,
  );
  return { onSelectApp };
}

/** 一覧の行だけを拾う */
function appRows(): HTMLElement[] {
  return screen
    .getAllByRole("row")
    .filter((row) => row.hasAttribute("tabindex"));
}

describe("AppManagementPage のキーボード導線", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(window, {
      kintoneAPI: {
        getApps: vi.fn(async () => ({
          success: true,
          data: { apps, hasMore: false },
        })),
      },
      // ヘッダーが読むだけの窓口。ここが無いと描画中に落ちる
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

  it("開いたら検索欄にフォーカスが当たっている", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText("アプリを絞り込む")).toHaveFocus(),
    );
  });

  it("検索欄から↓で一覧の先頭に入る", async () => {
    renderPage();
    await screen.findByText("案件管理");

    await userEvent.keyboard("{ArrowDown}");

    expect(appRows()[0]).toHaveFocus();
  });

  it("絞り込みが1件ならEnterでそのまま開く", async () => {
    const { onSelectApp } = renderPage();
    await screen.findByText("案件管理");

    await userEvent.keyboard("契約{Enter}");

    expect(onSelectApp).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "3" }),
    );
  });

  it("候補が複数あるEnterは開かず、一覧の先頭へ移るだけ", async () => {
    const { onSelectApp } = renderPage();
    await screen.findByText("案件管理");

    await userEvent.keyboard("管理{Enter}");

    expect(onSelectApp).not.toHaveBeenCalled();
    expect(appRows()[0]).toHaveFocus();
  });

  it("一覧に入ったあとは↑↓で行を移り、Enterで開く", async () => {
    const { onSelectApp } = renderPage();
    await screen.findByText("案件管理");

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // 既定は更新の新しい順。先頭が案件管理、次が受注管理
    expect(onSelectApp).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "2" }),
    );
  });
});
