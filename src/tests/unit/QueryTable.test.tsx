import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import QueryTable from "@/components/QueryTable";
import { SavedQuery } from "@/hooks/useQueryGenerator";

const queries: SavedQuery[] = [
  {
    id: "a",
    appId: "1",
    name: "今月の受注",
    memo: "営業定例で使う",
    conditions: [],
    orderBy: "none",
    generatedQuery: 'ステータス = "受注"',
    createdAt: "2026-08-26T10:00:00Z",
  },
  {
    id: "b",
    appId: "1",
    name: "未対応の問い合わせ",
    conditions: [],
    orderBy: "none",
    generatedQuery: "",
    createdAt: "2026-08-20T10:00:00Z",
  },
  {
    id: "c",
    appId: "1",
    name: "全件",
    conditions: [],
    orderBy: "none",
    generatedQuery: "",
    createdAt: "2026-08-01T10:00:00Z",
  },
];

function renderTable(
  overrides: Partial<React.ComponentProps<typeof QueryTable>> = {},
) {
  const props = {
    queries,
    pinnedIds: new Set<string>(["c"]),
    selectedIds: new Set<string>(),
    onEditQuery: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleSelect: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onDeleteQuery: vi.fn(),
    ...overrides,
  };
  render(<QueryTable {...props} />);
  return props;
}

function queryRows(): HTMLElement[] {
  return screen
    .getAllByRole("row")
    .filter((row) => row.hasAttribute("tabindex"));
}

function rowNames(): string[] {
  return queryRows().map(
    (row) => within(row).getAllByRole("cell")[2].textContent ?? "",
  );
}

describe("QueryTable", () => {
  it("ピン留めを先頭に、残りは作成の新しい順に並べる", () => {
    renderTable();

    expect(rowNames()).toEqual([
      expect.stringContaining("全件"),
      expect.stringContaining("今月の受注"),
      expect.stringContaining("未対応の問い合わせ"),
    ]);
  });

  it("条件のないクエリは全件と分かるように書く", () => {
    renderTable();

    expect(screen.getAllByText("条件なし（全件）")).toHaveLength(2);
  });

  it("行をクリックすると編集に進む", async () => {
    const { onEditQuery } = renderTable();

    await userEvent.click(screen.getByText("今月の受注"));

    expect(onEditQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );
  });

  it("↑↓で移動し、Enterで編集、Spaceで選択、Deleteで削除に進む", async () => {
    const { onEditQuery, onToggleSelect, onDeleteQuery } = renderTable();

    queryRows()[0].focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");
    expect(onToggleSelect).toHaveBeenCalledWith("a");

    await userEvent.keyboard("{Delete}");
    expect(onDeleteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );

    await userEvent.keyboard("{Enter}");
    expect(onEditQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );
  });

  it("チェックボックスは行の遷移を巻き込まない", async () => {
    const { onEditQuery, onToggleSelect } = renderTable();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "今月の受注 を選択" }),
    );

    expect(onToggleSelect).toHaveBeenCalledWith("a");
    expect(onEditQuery).not.toHaveBeenCalled();
  });

  it("ピンは行の遷移を巻き込まない", async () => {
    const { onEditQuery, onTogglePin } = renderTable();

    await userEvent.click(
      screen.getAllByRole("button", { name: "ピン留めを外す" })[0],
    );

    expect(onTogglePin).toHaveBeenCalledWith("c");
    expect(onEditQuery).not.toHaveBeenCalled();
  });

  it("Tabで入れる行はひとつだけ", () => {
    renderTable();

    expect(
      queryRows().filter((row) => row.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
  });
});
