import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRecordCountCache,
  fetchRecordCount,
  getCachedRecordCount,
} from "@/utils/record-count";
import { KintoneAuth } from "@/types/kintone";

const auth: KintoneAuth = {
  subdomain: "example",
  username: "user",
  password: "pass",
};

const app = { appId: "12", spaceId: null };

function mockExecuteQuery(
  implementation: () => Promise<{
    success: boolean;
    data?: { records: never[]; totalCount?: string | null };
    error?: string;
  }>,
) {
  const executeQuery = vi.fn(implementation);
  // 実際に使うのは executeQuery だけなので、他のAPIは生やさない
  (window as unknown as { kintoneAPI: unknown }).kintoneAPI = { executeQuery };
  return executeQuery;
}

describe("fetchRecordCount", () => {
  beforeEach(() => {
    clearRecordCountCache();
  });

  it("totalCountを数値にして返す", async () => {
    const executeQuery = mockExecuteQuery(async () => ({
      success: true,
      data: { records: [], totalCount: "1234" },
    }));

    await expect(fetchRecordCount(auth, app)).resolves.toEqual({
      status: "success",
      count: 1234,
    });

    // limit 1 で1レコードに抑えつつ、totalCountで総数を受け取る
    expect(executeQuery).toHaveBeenCalledWith(auth, "12", "limit 1", null, {
      totalCount: true,
    });
  });

  it("2回目はキャッシュから返し、APIを叩かない", async () => {
    const executeQuery = mockExecuteQuery(async () => ({
      success: true,
      data: { records: [], totalCount: "7" },
    }));

    await fetchRecordCount(auth, app);
    await fetchRecordCount(auth, app);

    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(getCachedRecordCount("12")).toBe(7);
  });

  it("force指定ならキャッシュを無視して取り直す", async () => {
    const executeQuery = mockExecuteQuery(async () => ({
      success: true,
      data: { records: [], totalCount: "7" },
    }));

    await fetchRecordCount(auth, app);
    await fetchRecordCount(auth, app, { force: true });

    expect(executeQuery).toHaveBeenCalledTimes(2);
  });

  it("403は権限の説明に言い換える", async () => {
    mockExecuteQuery(async () => ({
      success: false,
      error: 'クエリの実行に失敗しました (403): {"code":"CB_NO02"}',
    }));

    const result = await fetchRecordCount(auth, app);

    expect(result).toEqual({
      status: "error",
      message: "レコードの閲覧権限がないため取得できませんでした",
    });
    expect(getCachedRecordCount("12")).toBeUndefined();
  });

  it("totalCountが無ければエラーにする", async () => {
    mockExecuteQuery(async () => ({
      success: true,
      data: { records: [] },
    }));

    await expect(fetchRecordCount(auth, app)).resolves.toEqual({
      status: "error",
      message: "レコード件数を取得できませんでした",
    });
  });

  it("例外もエラーとして返す", async () => {
    mockExecuteQuery(async () => {
      throw new Error("ネットワークに繋がりません");
    });

    await expect(fetchRecordCount(auth, app)).resolves.toEqual({
      status: "error",
      message: "ネットワークに繋がりません",
    });
  });
});
