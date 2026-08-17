import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { generateKeyPairSync, createSign, createHash } from "crypto";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir, hostname } from "os";
import { join } from "path";

import {
  LicenseFile,
  getLicensePath,
  getHardwareHash,
  parseExpiryDate,
  verifySignedLicense,
  NL_GRACE_DAYS,
} from "@/main/license";

/**
 * 署名検証は本番の公開鍵に固定されているため、テスト用の鍵ペアで
 * 署名したライセンスは「署名不正」として弾かれる。
 * ここでは公開鍵に依存しない部分（パス組み立て・期限判定・
 * ハードウェア照合・フォーマット検証）を検証する。
 */

let privateKey: string;
const tmpDirs: string[] = [];

beforeAll(() => {
  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  privateKey = keys.privateKey;
});

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** ISO日付文字列を今日からの相対日数で作る */
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    license_uid: "uid1",
    product_id: 1,
    product_name: "Test",
    product_tag: "ktn",
    license_type: "FL",
    expiry_date: isoDate(365),
    auth_limit_date: null,
    custom: {},
    ...overrides,
  };
}

/** テスト鍵で署名した（＝本番公開鍵では検証に失敗する）ライセンス */
function makeSigned(payload: Record<string, unknown>) {
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");
  const signer = createSign("RSA-SHA256");
  signer.update(payloadBytes);
  signer.end();
  return {
    alg: "rsa2048-sha256",
    payload: payloadBytes.toString("base64"),
    sig: signer.sign(privateKey).toString("base64"),
  };
}

/** ライセンスファイルを一時ディレクトリに書き出し、そのディレクトリを返す */
function writeLicense(signed: unknown, tag = "ktn"): string {
  const dir = mkdtempSync(join(tmpdir(), "license-test-"));
  tmpDirs.push(dir);
  writeFileSync(join(dir, `${tag}_license.json`), JSON.stringify(signed), "utf-8");
  return dir;
}

describe("getLicensePath", () => {
  it("{product_tag}_license.json のパスを組み立てる", () => {
    expect(getLicensePath("ktn", "/lic")).toBe(join("/lic", "ktn_license.json"));
  });
});

describe("getHardwareHash", () => {
  it("hostnameは小文字、fingerprintはSHA256(hostname)", () => {
    const hw = getHardwareHash();
    const expected = createHash("sha256")
      .update(hostname().toLowerCase(), "utf8")
      .digest("hex");

    expect(hw.hostname).toBe(hostname().toLowerCase());
    expect(hw.fingerprint).toBe(expected);
  });
});

describe("parseExpiryDate", () => {
  it("日付のみの文字列を当日の終わりとして解釈する", () => {
    const d = parseExpiryDate("2026-08-31");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 0始まり
    expect(d.getDate()).toBe(31);
    // 期限当日は有効であるべきなので一日の終わりに丸める
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it("時刻付き（ISO）でも日付部分を解釈する", () => {
    const d = parseExpiryDate("2026-08-31T10:00:00");
    expect(d.getDate()).toBe(31);
    expect(d.getMonth()).toBe(7);
  });

  it("空文字・不正な文字列は例外を投げる", () => {
    expect(() => parseExpiryDate("")).toThrow();
    expect(() => parseExpiryDate("bad-date")).toThrow();
  });
});

describe("verifySignedLicense", () => {
  it("alg / payload / sig が欠けていれば形式エラー", () => {
    expect(() => verifySignedLicense({})).toThrow(/形式が正しくありません/);
    expect(() => verifySignedLicense({ alg: "hs256", payload: "a", sig: "b" })).toThrow(
      /形式が正しくありません/,
    );
    expect(() => verifySignedLicense({ alg: "rsa2048-sha256", payload: "" })).toThrow(
      /形式が正しくありません/,
    );
  });

  it("正規の公開鍵で検証できない署名は拒否する", () => {
    // テスト鍵で署名しているため、本番公開鍵では必ず検証に失敗する
    expect(() => verifySignedLicense(makeSigned(basePayload()))).toThrow(
      /正しくありません/,
    );
  });
});

describe("LicenseFile.load", () => {
  it("ファイルが無ければ配置先を含むエラーを投げる", () => {
    const dir = mkdtempSync(join(tmpdir(), "license-test-"));
    tmpDirs.push(dir);

    expect(() => new LicenseFile("ktn", dir).load()).toThrow(/認証が完了していません/);
    expect(() => new LicenseFile("ktn", dir).load()).toThrow(
      new RegExp(getLicensePath("ktn", dir).replace(/\\/g, "\\\\")),
    );
  });

  it("JSONとして壊れていれば形式エラー", () => {
    const dir = mkdtempSync(join(tmpdir(), "license-test-"));
    tmpDirs.push(dir);
    writeFileSync(join(dir, "ktn_license.json"), "{ broken", "utf-8");

    expect(() => new LicenseFile("ktn", dir).load()).toThrow(/形式が正しくありません/);
  });

  it("署名が本番公開鍵で検証できなければ読み込めない", () => {
    const dir = writeLicense(makeSigned(basePayload()));
    expect(() => new LicenseFile("ktn", dir).load()).toThrow(/正しくありません/);
  });
});

/**
 * 検証ロジック（期限・猶予・product_tag照合）は署名検証の後段にあるため、
 * load() をスタブして単体で確認する。
 */
describe("LicenseFile.verify", () => {
  function verifyWith(payloadOverrides: Record<string, unknown> = {}) {
    const payload = basePayload(payloadOverrides);
    const lf = new LicenseFile("ktn", "/dummy");
    const custom = (payload.custom as Record<string, unknown>) || {};

    // 署名検証済みの状態を再現する
    (lf as unknown as { licenseInfo: unknown }).licenseInfo = {
      licenseUid: String(payload.license_uid),
      productId: Number(payload.product_id),
      productName: String(payload.product_name),
      productTag: String(payload.product_tag),
      licenseType: String(payload.license_type),
      expiryDate: payload.expiry_date ?? null,
      authLimitDate: payload.auth_limit_date ?? null,
      isMigs: String(custom.is_migs ?? "").toLowerCase() === "true",
      rawData: payload,
    };
    return lf.verify();
  }

  const currentFingerprint = createHash("sha256")
    .update(hostname().toLowerCase(), "utf8")
    .digest("hex");

  it("FL: 期限内なら有効", () => {
    expect(verifyWith().valid).toBe(true);
  });

  it("FL: expiry_dateがnullなら無期限で有効", () => {
    expect(verifyWith({ expiry_date: null }).valid).toBe(true);
  });

  it("FL: 期限当日は有効（当日中は使える）", () => {
    expect(verifyWith({ expiry_date: isoDate(0) }).valid).toBe(true);
  });

  it("FL: 期限切れは無効（猶予なし）", () => {
    const result = verifyWith({ expiry_date: isoDate(-1) });
    expect(result.valid).toBe(false);
    expect(result.inGracePeriod).toBe(false);
    expect(result.reason).toMatch(/有効期限が切れています/);
  });

  it("FL: expiry_dateが不正ならパースエラーで無効", () => {
    const result = verifyWith({ expiry_date: "bad-date" });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/パースに失敗/);
  });

  it("product_tagが一致しなければ無効", () => {
    const result = verifyWith({ product_tag: "other" });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/product_tag/);
  });

  it("product_tagが空なら照合をスキップする", () => {
    expect(verifyWith({ product_tag: "" }).valid).toBe(true);
  });

  it("NL: ハードウェアが一致し期限内なら有効", () => {
    const result = verifyWith({
      license_type: "NL",
      hw_hash: { fingerprint: currentFingerprint },
    });
    expect(result.valid).toBe(true);
    expect(result.inGracePeriod).toBe(false);
  });

  it("NL: 別PCのフィンガープリントなら無効", () => {
    const result = verifyWith({
      license_type: "NL",
      hw_hash: { fingerprint: "0".repeat(64) },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/このPCはライセンス登録されていません/);
  });

  it("NL: hw_hashが無ければ無効", () => {
    const result = verifyWith({ license_type: "NL", hw_hash: {} });
    expect(result.valid).toBe(false);
  });

  it(`NL: 期限切れでも${NL_GRACE_DAYS}日の猶予期間内は有効（残日数つき警告）`, () => {
    const result = verifyWith({
      license_type: "NL",
      expiry_date: isoDate(-10),
      hw_hash: { fingerprint: currentFingerprint },
    });
    expect(result.valid).toBe(true);
    expect(result.inGracePeriod).toBe(true);
    expect(result.graceDaysRemaining).toBe(NL_GRACE_DAYS - 10);
    expect(result.reason).toMatch(/更新手続き/);
  });

  it("NL: 猶予期間を過ぎたら無効", () => {
    const result = verifyWith({
      license_type: "NL",
      expiry_date: isoDate(-(NL_GRACE_DAYS + 1)),
      hw_hash: { fingerprint: currentFingerprint },
    });
    expect(result.valid).toBe(false);
    expect(result.inGracePeriod).toBe(false);
  });
});
