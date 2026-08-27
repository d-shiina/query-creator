import {
  test,
  expect,
  signIn,
  openQueryBuilder,
  sentQueries,
} from "./fixtures";

/**
 * クエリ生成画面の主要な振る舞い。
 * kintoneへの窓口だけ差し替え、画面は本物を動かしている。
 */

test("ログインするとアプリ一覧が出る", async ({ app }) => {
  await signIn(app);

  await expect(app.getByText("案件管理")).toBeVisible();
});

test("画面を開いた時点でレコードが見えている（実行操作は不要）", async ({
  app,
}) => {
  await signIn(app);
  await openQueryBuilder(app);

  const rows = app.locator("aside table tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(app.getByLabel("実行結果")).toContainText("5,231件");

  // 条件が無いので、取得範囲だけのクエリが1回だけ投げられている
  expect(await sentQueries(app)).toEqual(["limit 100"]);
});

test("条件を打つと、入力が落ち着いてから1回だけ取り直す", async ({ app }) => {
  await signIn(app);
  await openQueryBuilder(app);

  await app.getByLabel("フィールドを選択").first().click();
  await app.getByRole("option", { name: "案件名" }).click();
  await app.getByLabel("値を入力").first().pressSequentially("案件A", {
    delay: 60,
  });

  await expect
    .poll(() => sentQueries(app))
    .toEqual(["limit 100", '案件名 = "案件A" limit 100']);
});

test("件数とスキップがプレビューに反映される", async ({ app }) => {
  await signIn(app);
  await openQueryBuilder(app);

  await app.getByLabel("取得件数を入力").fill("5");
  await expect.poll(() => sentQueries(app)).toContain("limit 5");
  await expect(app.locator("aside table tbody tr")).toHaveCount(5);

  await app.getByLabel("スキップ件数を入力").fill("10");
  await expect.poll(() => sentQueries(app)).toContain("limit 5 offset 10");
  await expect(app.locator("aside table tbody tr").first()).toContainText(
    "案件 10",
  );
});

test("レコードの値をJSONのまま出さない", async ({ app }) => {
  await signIn(app);
  await openQueryBuilder(app);

  const creatorCell = app
    .locator("aside table tbody tr")
    .first()
    .getByText("橋爪研人");

  await expect(creatorCell).toBeVisible();
  await expect(app.locator("aside table")).not.toContainText('{"code"');
});

test("ペインの幅を変えると、その比率が次に開いたときも残る", async ({
  app,
}) => {
  await signIn(app);
  await openQueryBuilder(app);

  const separator = app.getByRole("separator", {
    name: "条件とプレビューの幅を調整",
  });
  const before = (await separator.boundingBox())!;

  await app.mouse.move(before.x + 4, before.y + 200);
  await app.mouse.down();
  await app.mouse.move(before.x + 200, before.y + 200, { steps: 10 });
  await app.mouse.up();

  const after = (await separator.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 100);

  const stored = await app.evaluate(() =>
    localStorage.getItem("queryGenerator.splitRatio"),
  );
  expect(Number(stored)).toBeGreaterThan(0);
});

test("ウィンドウ操作ボタンが他の要素に覆われていない", async ({ app }) => {
  await signIn(app);
  await openQueryBuilder(app);

  // 以前はスクロールバーが上まで伸びて、閉じるボタンの右上を奪っていた
  const reachable = await app.evaluate(() => {
    const button = document.querySelector('[aria-label="閉じる"]');
    if (!button) return null;

    const rect = button.getBoundingClientRect();
    return [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.right - 2, rect.top + 2],
    ].every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit === button || button.contains(hit);
    });
  });

  expect(reachable).toBe(true);
});

test("条件行は幅が変わっても溢れない", async ({ app }) => {
  await signIn(app);
  await openQueryBuilder(app);

  const separator = app.getByRole("separator", {
    name: "条件とプレビューの幅を調整",
  });

  for (const target of [460, 700, 1000]) {
    const box = (await separator.boundingBox())!;
    await app.mouse.move(box.x + 4, box.y + 200);
    await app.mouse.down();
    await app.mouse.move(target, box.y + 200, { steps: 8 });
    await app.mouse.up();

    const overflows = await app.evaluate(() => {
      const pane = document.querySelector('[class*="@container"]');
      return pane ? pane.scrollWidth > pane.clientWidth : true;
    });

    expect(overflows, `左ペインを${target}pxにしたとき`).toBe(false);
  }
});
