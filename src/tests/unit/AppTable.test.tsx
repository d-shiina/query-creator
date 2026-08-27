import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppTable from "@/components/AppTable";
import { KintoneApp } from "@/types/kintone";

const apps: KintoneApp[] = [
  {
    appId: "3",
    name: "受注管理",
    code: "ORDER",
    modifiedAt: "2026-08-20T10:00:00Z",
  },
  {
    appId: "1",
    name: "案件管理",
    modifiedAt: "2026-08-26T10:00:00Z",
  },
  {
    appId: "7",
    name: "顧客マスタ",
    isFavorite: true,
    modifiedAt: "2020-01-01T10:00:00Z",
  },
];

function renderTable(
  overrides: Partial<React.ComponentProps<typeof AppTable>> = {},
) {
  const props = {
    apps,
    queryCounts: { "3": 2 },
    onSelectApp: vi.fn(),
    onToggleFavorite: vi.fn(),
    onShowDetail: vi.fn(),
    ...overrides,
  };
  render(<AppTable {...props} />);
  return props;
}

/** 行の並びをアプリ名で取り出す */
function rowNames(): string[] {
  const [, ...rows] = screen.getAllByRole("row");
  return rows.map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

describe("AppTable", () => {
  it("ブックマークを先頭に、既定では更新の新しい順に並べる", () => {
    renderTable();

    expect(rowNames()).toEqual([
      expect.stringContaining("顧客マスタ"),
      expect.stringContaining("案件管理"),
      expect.stringContaining("受注管理"),
    ]);
  });

  it("見出しを押すと並べ替わり、ブックマークは先頭のまま", async () => {
    renderTable();

    // 名前順（昇順）では 受注管理 < 案件管理。既定の更新日順とは並びが変わる
    await userEvent.click(screen.getByRole("button", { name: /アプリ名/ }));

    expect(rowNames()).toEqual([
      expect.stringContaining("顧客マスタ"),
      expect.stringContaining("受注管理"),
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
    const [, firstRow] = screen.getAllByRole("row");

    firstRow.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onSelectApp).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "1" }),
    );
  });

  it("Spaceで詳細を開く", async () => {
    const { onShowDetail } = renderTable();
    const [, firstRow] = screen.getAllByRole("row");

    firstRow.focus();
    await userEvent.keyboard(" ");

    expect(onShowDetail).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "7" }),
    );
  });

  it("★をキーボードで押しても行の操作にはならない", async () => {
    const { onSelectApp, onToggleFavorite } = renderTable();

    screen.getByRole("button", { name: "ブックマークを外す" }).focus();
    await userEvent.keyboard("{Enter}");

    expect(onToggleFavorite).toHaveBeenCalledWith("7");
    expect(onSelectApp).not.toHaveBeenCalled();
  });

  it("★は行の選択を巻き込まない", async () => {
    const { onSelectApp, onToggleFavorite } = renderTable();

    await userEvent.click(
      screen.getByRole("button", { name: "ブックマークを外す" }),
    );

    expect(onToggleFavorite).toHaveBeenCalledWith("7");
    expect(onSelectApp).not.toHaveBeenCalled();
  });
});
