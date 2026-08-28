import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppTable, { AppTableHandle } from "@/components/AppTable";
import { KintoneApp } from "@/types/kintone";

const apps: KintoneApp[] = [
  {
    appId: "3",
    name: "受注管理",
    code: "ORDER",
    modifiedAt: "2026-08-20T10:00:00Z",
  },
  { appId: "1", name: "案件管理", modifiedAt: "2026-08-26T10:00:00Z" },
  {
    appId: "7",
    name: "顧客マスタ",
    isPinned: true,
    modifiedAt: "2020-01-01T10:00:00Z",
  },
  { appId: "5", name: "在庫管理", modifiedAt: "2026-08-01T10:00:00Z" },
];

function renderTable(
  overrides: Partial<React.ComponentProps<typeof AppTable>> = {},
) {
  const props = {
    apps,
    queryCounts: { "3": 2 },
    onSelectApp: vi.fn(),
    onTogglePin: vi.fn(),
    onShowDetail: vi.fn(),
    ...overrides,
  };
  render(<AppTable {...props} />);
  return props;
}

/** アプリの行だけを拾う（セクション見出しの行を除く） */
function appRows(): HTMLElement[] {
  return screen
    .getAllByRole("row")
    .filter((row) => row.hasAttribute("tabindex"));
}

/** 行の並びをアプリ名で取り出す */
function rowNames(): string[] {
  return appRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

describe("AppTable", () => {
  it("ピン留めを先頭のセクションに、残りは更新の新しい順に並べる", () => {
    renderTable();

    expect(rowNames()).toEqual([
      expect.stringContaining("顧客マスタ"),
      expect.stringContaining("案件管理"),
      expect.stringContaining("受注管理"),
      expect.stringContaining("在庫管理"),
    ]);
  });

  it("セクションが1つしかないときは見出しを出さない", () => {
    renderTable({ apps: apps.filter((app) => !app.isPinned) });

    expect(screen.queryByText("すべて")).not.toBeInTheDocument();
  });

  it("見出しを押すと並べ替わり、ピン留めは先頭のまま", async () => {
    renderTable();

    // 名前順（昇順）では 受注 < 在庫 < 案件
    await userEvent.click(screen.getByRole("button", { name: /アプリ名/ }));

    expect(rowNames()).toEqual([
      expect.stringContaining("顧客マスタ"),
      expect.stringContaining("受注管理"),
      expect.stringContaining("在庫管理"),
      expect.stringContaining("案件管理"),
    ]);
  });

  it("行をクリックするとアプリを選ぶ", async () => {
    const { onSelectApp } = renderTable();

    await userEvent.click(screen.getByText("案件管理"));

    expect(onSelectApp).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "1" }),
    );
  });

  it("↓で次の行へ移り、Enterで開く", async () => {
    const { onSelectApp } = renderTable();

    appRows()[0].focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onSelectApp).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "1" }),
    );
  });

  it("Tabで入れる行はひとつだけ（何百行もタブ送りさせない）", () => {
    renderTable();

    const tabbable = appRows().filter(
      (row) => row.getAttribute("tabindex") === "0",
    );

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(appRows()[0]);
  });

  it("外から先頭行にフォーカスできる", () => {
    const ref = React.createRef<AppTableHandle>();
    renderTable({ ref });

    ref.current?.focusRow(0);

    expect(appRows()[0]).toHaveFocus();
  });

  it("Spaceで詳細を開く", async () => {
    const { onShowDetail } = renderTable();

    appRows()[0].focus();
    await userEvent.keyboard(" ");

    expect(onShowDetail).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "7" }),
    );
  });

  it("ピンをキーボードで押しても行の操作にはならない", async () => {
    const { onSelectApp, onTogglePin } = renderTable();

    screen.getByRole("button", { name: "ピン留めを外す" }).focus();
    await userEvent.keyboard("{Enter}");

    expect(onTogglePin).toHaveBeenCalledWith("7");
    expect(onSelectApp).not.toHaveBeenCalled();
  });

  it("ピンは行の選択を巻き込まない", async () => {
    const { onSelectApp, onTogglePin } = renderTable();

    await userEvent.click(
      screen.getByRole("button", { name: "ピン留めを外す" }),
    );

    expect(onTogglePin).toHaveBeenCalledWith("7");
    expect(onSelectApp).not.toHaveBeenCalled();
  });
});
