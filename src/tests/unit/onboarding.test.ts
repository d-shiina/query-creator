import { beforeEach, describe, expect, it } from "vitest";
import {
  TOUR_APP_LIST,
  hasSeenTour,
  markTourSeen,
  resetTour,
} from "@/utils/onboarding";

describe("初回案内の記録", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("見るまでは未読、記録すると既読になる", () => {
    expect(hasSeenTour(TOUR_APP_LIST)).toBe(false);

    markTourSeen(TOUR_APP_LIST);

    expect(hasSeenTour(TOUR_APP_LIST)).toBe(true);
  });

  it("二重に記録しても増えない", () => {
    markTourSeen(TOUR_APP_LIST);
    markTourSeen(TOUR_APP_LIST);

    expect(
      JSON.parse(localStorage.getItem("kintone-tours-seen") ?? "[]"),
    ).toEqual([TOUR_APP_LIST]);
  });

  it("指定した案内だけ出し直せる", () => {
    markTourSeen(TOUR_APP_LIST);
    markTourSeen("other@1");

    resetTour(TOUR_APP_LIST);

    expect(hasSeenTour(TOUR_APP_LIST)).toBe(false);
    expect(hasSeenTour("other@1")).toBe(true);
  });

  it("壊れた保存値は未読として扱う", () => {
    localStorage.setItem("kintone-tours-seen", "{壊れている");

    expect(hasSeenTour(TOUR_APP_LIST)).toBe(false);
  });
});
