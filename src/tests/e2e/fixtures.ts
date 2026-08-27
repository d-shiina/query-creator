import { test as base, expect, type Page } from "@playwright/test";

/**
 * レンダラーを直接ブラウザで動かすためのお膳立て。
 *
 * パッケージ済みのElectronを起動する方式は使えない。
 * 起動時のライセンス検証に通らないとウィンドウが作られず、
 * CIには有効なライセンスが無いため、確認用のダイアログが出たまま止まる。
 * ライセンス回避の仕組みを製品バイナリに入れるわけにもいかない。
 *
 * そこで preload が公開するAPIと同じ形の窓口を差し込み、
 * 画面そのものの振る舞いを検証する。
 */

export const DEMO_APP = { appId: "1", name: "案件管理" };
/** プレビューが投げたクエリの記録を読むためのキー */
declare global {
  interface Window {
    __sentQueries?: string[];
  }
}

export type StubOptions = {
  /** 条件に一致する総件数（totalCountとして返す） */
  totalCount?: number;
};

async function installPreloadStubs(page: Page, options: StubOptions = {}) {
  await page.addInitScript((opts: StubOptions) => {
    const totalCount = opts.totalCount ?? 5231;
    window.__sentQueries = [];

    window.themeMode = {
      current: async () => "light" as const,
      toggle: async () => false,
      dark: async () => {},
      light: async () => {},
      system: async () => false,
    };

    window.electronWindow = {
      minimize: async () => {},
      maximize: async () => {},
      close: async () => {},
      isMaximized: async () => false,
      onMaximizeChange: () => () => {},
      platform: "win32",
      toggleDevTools: async () => {},
      openDevTools: async () => {},
      closeDevTools: async () => {},
    };

    window.electronAppAPI = {
      getAppInfo: async () => ({
        version: "1.0.0",
        license: "UNLICENSED",
        author: "Marubeni-I-DIGIO",
        productName: "kintone API Query Creator",
        description: "",
        homepage: "",
        licenseExpiry: "2099-12-31T00:00:00.000Z",
      }),
      getFallbackInfo: async () => {
        throw new Error("未使用");
      },
      checkTrialExpiry: async () => false,
      getLicenseStatus: async () => null,
      reloadLicense: async () => ({ success: true }),
      quit: async () => {},
      openExternalURL: async () => ({ success: true }),
    };

    const apps = [
      {
        appId: "1",
        name: "案件管理",
        description: "デモ用のアプリ",
        createdAt: "2025-01-01T00:00:00Z",
        modifiedAt: "2025-06-01T00:00:00Z",
        creator: { code: "u1", name: "作成者" },
        modifier: { code: "u1", name: "更新者" },
        spaceId: null,
        threadId: null,
      },
    ];

    const fields = [
      {
        code: "案件名",
        label: "案件名",
        type: "SINGLE_LINE_TEXT",
        required: true,
        unique: false,
        options: [],
      },
      {
        code: "金額",
        label: "金額",
        type: "NUMBER",
        required: false,
        unique: false,
        options: [],
      },
      {
        code: "作成者",
        label: "作成者",
        type: "CREATOR",
        required: false,
        unique: false,
        options: [],
      },
    ];

    window.kintoneAPI = {
      login: async () => ({ success: true }),
      getApps: async () => ({ success: true, data: { apps, hasMore: false } }),
      getUsers: async () => ({ success: true, data: [] }),
      getAppFields: async () => ({ success: true, data: { fields } }),
      executeQuery: async (_auth, _appId, query) => {
        window.__sentQueries?.push(query);

        // limit / offset を解釈して、本物と同じ形で返す
        const size = Number(/limit (\d+)/.exec(query)?.[1] ?? 100);
        const skip = Number(/offset (\d+)/.exec(query)?.[1] ?? 0);
        const count = Math.max(0, Math.min(size, totalCount - skip));
        const records = Array.from({ length: count }, (_unused, i) => ({
          案件名: { type: "SINGLE_LINE_TEXT", value: `案件 ${skip + i}` },
          金額: { type: "NUMBER", value: String(1000 * (skip + i)) },
          作成者: { type: "CREATOR", value: { code: "u1", name: "橋爪研人" } },
        }));

        return {
          success: true,
          data: { records, totalCount: String(totalCount) },
        };
      },
    } as Window["kintoneAPI"];
  }, options);
}

export const test = base.extend<{
  app: Page;
  stub: (options?: StubOptions) => Promise<Page>;
}>({
  // 既定のデータでログイン後まで進めた状態を渡す
  app: async ({ page }, use) => {
    await installPreloadStubs(page);
    await page.goto("/");
    await use(page);
  },
  // 件数など条件を変えたい場合に使う
  stub: async ({ page }, use) => {
    await use(async (options?: StubOptions) => {
      await installPreloadStubs(page, options);
      await page.goto("/");
      return page;
    });
  },
});

export { expect };

/** ログイン画面からアプリ一覧まで進める */
export async function signIn(page: Page) {
  await page.getByPlaceholder("your-company").fill("demo");
  await page.getByPlaceholder("ログインID").fill("user");
  await page.getByPlaceholder("パスワード").fill("password");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
}

/** アプリ一覧からクエリ生成画面まで進める */
export async function openQueryBuilder(page: Page) {
  await page.getByRole("button", { name: "クエリ生成" }).first().click();
  await page.getByRole("button", { name: "新規クエリ作成" }).click();
  await expect(page.getByText("検索条件", { exact: true })).toBeVisible();
}

/** プレビューが投げたクエリの一覧 */
export function sentQueries(page: Page) {
  return page.evaluate(() => window.__sentQueries ?? []);
}
