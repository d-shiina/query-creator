import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Coachmarks from "@/components/Coachmarks";

/**
 * jsdomは要素の大きさを持たないので、指す先の矩形だけ用意する。
 * data-tour が付いた要素は実寸を返し、それ以外は0のまま＝見つからない扱い。
 */
function giveTargetsSize() {
  Element.prototype.getBoundingClientRect = function () {
    const isTarget = (this as HTMLElement).hasAttribute?.("data-tour");
    const box = isTarget
      ? { x: 20, y: 40, width: 200, height: 32 }
      : { x: 0, y: 0, width: 0, height: 0 };
    return {
      ...box,
      top: box.y,
      left: box.x,
      right: box.x + box.width,
      bottom: box.y + box.height,
      toJSON: () => box,
    } as DOMRect;
  };
}

const steps = [
  { target: "search", title: "まず絞り込む", body: "「/」で検索へ" },
  { target: "pin", title: "先頭に固定できる", body: "ピンで固定" },
];

function renderTour(open = true) {
  const onClose = vi.fn();
  render(
    <>
      <div data-tour="search">検索欄</div>
      <div data-tour="pin">ピン</div>
      <Coachmarks steps={steps} open={open} onClose={onClose} />
    </>,
  );
  return { onClose };
}

describe("Coachmarks", () => {
  beforeEach(() => {
    giveTargetsSize();
  });

  it("開いていなければ何も出さない", () => {
    renderTour(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("最初の手順から出る", () => {
    renderTour();

    expect(screen.getByText("まず絞り込む")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("次へで進み、最後は閉じる", async () => {
    const { onClose } = renderTour();

    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("先頭に固定できる")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("×でいつでも閉じられる", async () => {
    const { onClose } = renderTour();

    await userEvent.click(screen.getByRole("button", { name: "案内を閉じる" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("Escapeで閉じ、→で進む", async () => {
    const { onClose } = renderTour();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("先頭に固定できる")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("指す先が無い手順は飛ばす", () => {
    const onClose = vi.fn();
    render(
      <>
        <div data-tour="pin">ピン</div>
        <Coachmarks steps={steps} open onClose={onClose} />
      </>,
    );

    // 1つ目（search）は画面に無いので、2つ目が出る
    expect(screen.getByText("先頭に固定できる")).toBeInTheDocument();
  });

  it("暗幕はクリックを受け取らない（背後をそのまま触れる）", () => {
    renderTour();

    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).toHaveClass("pointer-events-none");
  });
});
