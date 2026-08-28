import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuerySelectionPage from "@/pages/QuerySelectionPage";

const app = { appId: "12", name: "案件管理" };

const savedQueries = [
  {
    id: "a",
    appId: "12",
    name: "今月の受注",
    memo: "営業定例で使う",
    conditions: [],
    orderBy: "none",
    generatedQuery: 'ステータス = "受注"',
    createdAt: "2026-08-26T10:00:00Z",
  },
  {
    id: "b",
    appId: "12",
    name: "未対応の問い合わせ",
    conditions: [],
    orderBy: "none",
    generatedQuery: 'ステータス = "未対応"',
    createdAt: "2026-08-20T10:00:00Z",
  },
];

function renderPage() {
  const onEditQuery = vi.fn();
  const onBack = vi.fn();
  const onCreateNew = vi.fn();
  render(
    <QuerySelectionPage
      auth={{ subdomain: "example", username: "u", password: "p" }}
      app={app}
      onBack={onBack}
      onCreateNew={onCreateNew}
      onEditQuery={onEditQuery}
      onLogout={vi.fn()}
    />,
  );
  return { onEditQuery, onBack, onCreateNew };
}

function queryRows(): HTMLElement[] {
  return screen
    .getAllByRole("row")
    .filter((row) => row.hasAttribute("tabindex"));
}

describe("QuerySelectionPage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "kintone_saved_queries_12",
      JSON.stringify(savedQueries),
    );
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

  it("開いたら検索欄にフォーカスが当たっている", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText("クエリを絞り込む")).toHaveFocus(),
    );
  });

  it("メモやクエリ本文でも絞り込める", async () => {
    renderPage();
    await screen.findByText("今月の受注");

    await userEvent.keyboard("定例");

    expect(queryRows()).toHaveLength(1);
    expect(screen.getByText("今月の受注")).toBeInTheDocument();
  });

  it("1件に絞れていればEnterでそのまま編集に進む", async () => {
    const { onEditQuery } = renderPage();
    await screen.findByText("今月の受注");

    await userEvent.keyboard("未対応{Enter}");

    expect(onEditQuery).toHaveBeenCalledWith("b");
  });

  it("↓で一覧に入り、Enterで編集に進む", async () => {
    const { onEditQuery } = renderPage();
    await screen.findByText("今月の受注");

    await userEvent.keyboard("{ArrowDown}{Enter}");

    // 既定は作成の新しい順
    expect(onEditQuery).toHaveBeenCalledWith("a");
  });

  it("削除は確認してから消す", async () => {
    renderPage();
    await screen.findByText("今月の受注");

    await userEvent.click(
      screen.getByRole("button", { name: "今月の受注 を削除" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(screen.queryByText("今月の受注")).not.toBeInTheDocument(),
    );
    expect(
      JSON.parse(localStorage.getItem("kintone_saved_queries_12") ?? "[]"),
    ).toHaveLength(1);
  });

  it("検索欄のEscapeは、まず文字を消してから画面を戻る", async () => {
    const { onBack } = renderPage();
    await screen.findByText("今月の受注");

    await userEvent.keyboard("受注");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByLabelText("クエリを絞り込む")).toHaveValue("");
    expect(onBack).not.toHaveBeenCalled();

    await userEvent.keyboard("{Escape}");
    expect(onBack).toHaveBeenCalled();
  });
});
