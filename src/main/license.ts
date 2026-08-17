/**
 * RSA2048-SHA256 署名検証によるライセンス認証モジュール。
 *
 * winactor_for_kintone の `common/license.py` を TypeScript へ移植したもの。
 * ライセンスファイルの形式・配置場所・検証ルール（NLのハードウェア照合、
 * 90日の猶予期間、24時間の検証キャッシュ）は本家と同一に揃えている。
 *
 * 署名検証は Node 標準の crypto を使うため追加の依存はない。
 */

import { createHash, createVerify } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { hostname } from "os";
import { dirname, join } from "path";

/** ライセンスファイルの既定の配置ディレクトリ */
export const DEFAULT_LICENSE_DIR = join(
  process.env.PUBLIC || "C:\\Users\\Public",
  "msys-winactor-adapters",
  "licenses",
);

/**
 * 本製品の product_tag。
 * ライセンスファイル名（`{product_tag}_license.json`）と、
 * ペイロード内の product_tag 照合に使われる。
 */
export const PRODUCT_TAG = "ktn";

/** RSA2048 公開鍵（PEM形式） */
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3CCjuRxhBbxoznb2DI+N
vsCKlU2XmHFBdNzI966VV+8rIxQ+rVY+Mrt0u1kRNlek2A0hDz22SAcT4Z7zNOxq
5+TAKwikpto/NyTsyHwCuSDU0mIWBwlGnEC4+DRSO1EUkPogR9RiU5dmydQGdwcf
DfQSZzAlEkltv5nBUnTIwU7ON5tL6GEUb4gLDKF63pv9M1Hx9LSpvomz/nmEsxEC
z2jJQhpGNnvXjMhCYZ6WIA+v8ianBc23uqvRYD8DVqBl6oc8zVbGBOI+Js6BlAea
flm+PCNA2mYqtGoU5R08jVOlhPZ/xT/3wTJwMSmEsMQBhFgGzOJrIDr56sNTiQna
+QIDAQAB
-----END PUBLIC KEY-----`;

/** NL: 有効期限切れ後の猶予日数 */
export const NL_GRACE_DAYS = 90;

/** ライセンス検証キャッシュのTTL（秒） */
const CACHE_TTL_SECONDS = 86400; // 24時間

const FORMAT_ERROR =
  "ライセンスファイルの形式が正しくありません。正規のライセンスファイルを使用してください。";
const INVALID_ERROR =
  "ライセンスファイルが正しくありません。正規のライセンスファイルを使用してください。";

/** ライセンスファイルのフルパスを返す。 */
export function getLicensePath(
  productTag: string,
  licenseDir: string = DEFAULT_LICENSE_DIR,
): string {
  return join(licenseDir, `${productTag}_license.json`);
}

/**
 * ハードウェアフィンガープリントを計算して返す。
 * fingerprint = SHA256(hostname_lower)
 */
export function getHardwareHash(): { hostname: string; fingerprint: string } {
  const hostnameLower = hostname().toLowerCase();
  return {
    hostname: hostnameLower,
    fingerprint: createHash("sha256").update(hostnameLower, "utf8").digest("hex"),
  };
}

/** 署名付きライセンスの外側の構造 */
export interface SignedLicense {
  alg?: string;
  payload?: string;
  sig?: string;
}

/** ライセンスペイロード（署名検証済みの中身） */
export interface LicenseInfo {
  licenseUid: string;
  productId: number;
  productName: string;
  productTag: string;
  licenseType: string;
  /** ISO日付文字列（`2026-08-31` もしくは `2026-08-31T23:59:59`）。無期限ならnull */
  expiryDate: string | null;
  authLimitDate: string | null;
  isMigs: boolean;
  rawData: Record<string, unknown>;
}

/**
 * RSA2048-SHA256 署名を検証し、payload を返す。
 * @throws 署名不正またはフォーマット不正の場合
 */
export function verifySignedLicense(
  signedLicense: SignedLicense,
): Record<string, unknown> {
  const alg = signedLicense?.alg ?? "";
  const payloadB64 = signedLicense?.payload ?? "";
  const sigB64 = signedLicense?.sig ?? "";

  if (alg !== "rsa2048-sha256" || !payloadB64 || !sigB64) {
    throw new Error(FORMAT_ERROR);
  }

  let payloadBytes: Buffer;
  let sigBytes: Buffer;
  try {
    payloadBytes = Buffer.from(payloadB64, "base64");
    sigBytes = Buffer.from(sigB64, "base64");
  } catch {
    throw new Error(FORMAT_ERROR);
  }

  let verified = false;
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(payloadBytes);
    verifier.end();
    verified = verifier.verify(RSA_PUBLIC_KEY, sigBytes);
  } catch {
    // 公開鍵の形式不正なども検証失敗として扱う
    throw new Error(INVALID_ERROR);
  }

  if (!verified) {
    throw new Error(INVALID_ERROR);
  }

  try {
    return JSON.parse(payloadBytes.toString("utf-8"));
  } catch {
    throw new Error(FORMAT_ERROR);
  }
}

/**
 * expiry_date 文字列を「その日の終わり(23:59:59.999)」のDateへ変換する。
 *
 * 本家は date 型で `today > expiry` を判定しており、期限当日は有効。
 * Electron側では時刻を含むDateで比較するため、当日を有効に保つよう
 * 一日の終わりへ丸める。
 */
export function parseExpiryDate(expiryStr: string): Date {
  if (!expiryStr) {
    throw new Error("expiry_date が空です");
  }

  const datePart = expiryStr.includes("T") ? expiryStr.split("T")[0] : expiryStr;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    throw new Error(`expiry_date のパースに失敗しました: ${expiryStr}`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    23,
    59,
    59,
    999,
  );
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`expiry_date のパースに失敗しました: ${expiryStr}`);
  }
  return parsed;
}

/** 検証結果 */
export interface LicenseVerifyResult {
  valid: boolean;
  /** 無効な場合の理由、または猶予期間中の警告 */
  reason: string | null;
  /** 猶予期間中かどうか（NLのみ） */
  inGracePeriod: boolean;
  /** 猶予期間の残日数 */
  graceDaysRemaining: number | null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 日付単位の差分（日数） */
function diffInDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / msPerDay,
  );
}

/**
 * ライセンスファイルの読み込みと検証を担うクラス。
 */
export class LicenseFile {
  private licenseInfo: LicenseInfo | null = null;

  constructor(
    public readonly productTag: string,
    public readonly licenseDir: string = DEFAULT_LICENSE_DIR,
  ) {}

  /** ライセンスファイルを読み込み、署名検証を行って LicenseInfo を返す。 */
  load(): LicenseInfo {
    const licensePath = getLicensePath(this.productTag, this.licenseDir);

    if (!existsSync(licensePath)) {
      throw new Error(
        "認証が完了していません。ライセンスファイルを所定の場所に配置してください。\n" +
          `  場所: ${licensePath}`,
      );
    }

    let signedLicense: SignedLicense;
    try {
      signedLicense = JSON.parse(readFileSync(licensePath, "utf-8"));
    } catch {
      throw new Error(FORMAT_ERROR);
    }

    const payload = verifySignedLicense(signedLicense);
    const custom = (payload.custom as Record<string, unknown>) || {};

    this.licenseInfo = {
      licenseUid: String(payload.license_uid ?? ""),
      productId: Number(payload.product_id ?? 0),
      productName: String(payload.product_name ?? ""),
      productTag: String(payload.product_tag ?? ""),
      licenseType: String(payload.license_type ?? ""),
      expiryDate: (payload.expiry_date as string | null) ?? null,
      authLimitDate: (payload.auth_limit_date as string | null) ?? null,
      isMigs: String(custom.is_migs ?? "").toLowerCase() === "true",
      rawData: payload,
    };
    return this.licenseInfo;
  }

  /** NL（Named License）の検証。ハードウェア照合と猶予期間つき期限判定。 */
  private verifyNamedLicense(info: LicenseInfo): LicenseVerifyResult {
    const hwHash = (info.rawData.hw_hash as Record<string, unknown>) || {};
    const expectedFingerprint = hwHash.fingerprint as string | undefined;

    if (!expectedFingerprint) {
      return {
        valid: false,
        reason: INVALID_ERROR,
        inGracePeriod: false,
        graceDaysRemaining: null,
      };
    }

    if (getHardwareHash().fingerprint !== expectedFingerprint) {
      return {
        valid: false,
        reason:
          "このPCはライセンス登録されていません。ライセンスの再発行が必要です。",
        inGracePeriod: false,
        graceDaysRemaining: null,
      };
    }

    if (info.expiryDate) {
      let expiry: Date;
      try {
        expiry = parseExpiryDate(info.expiryDate);
      } catch (error) {
        return {
          valid: false,
          reason: String(error instanceof Error ? error.message : error),
          inGracePeriod: false,
          graceDaysRemaining: null,
        };
      }

      const now = new Date();
      if (now > expiry) {
        const graceEnd = new Date(expiry);
        graceEnd.setDate(graceEnd.getDate() + NL_GRACE_DAYS);

        if (now <= graceEnd) {
          const remaining = diffInDays(graceEnd, now);
          return {
            valid: true,
            reason:
              `ライセンスの有効期限が切れています（期限: ${info.expiryDate}）。` +
              `あと ${remaining} 日以内に更新手続きを行ってください。`,
            inGracePeriod: true,
            graceDaysRemaining: remaining,
          };
        }

        return {
          valid: false,
          reason: `ライセンスの有効期限が切れています（期限: ${info.expiryDate}）。更新手続きを行ってください。`,
          inGracePeriod: false,
          graceDaysRemaining: null,
        };
      }
    }

    return {
      valid: true,
      reason: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
    };
  }

  /** FL（Floating License）等の標準検証。猶予期間なし。 */
  private verifyStandardLicense(info: LicenseInfo): LicenseVerifyResult {
    if (info.expiryDate) {
      let expiry: Date;
      try {
        expiry = parseExpiryDate(info.expiryDate);
      } catch (error) {
        return {
          valid: false,
          reason: String(error instanceof Error ? error.message : error),
          inGracePeriod: false,
          graceDaysRemaining: null,
        };
      }

      if (new Date() > expiry) {
        return {
          valid: false,
          reason: `ライセンスの有効期限が切れています（期限: ${info.expiryDate}）。更新手続きを行ってください。`,
          inGracePeriod: false,
          graceDaysRemaining: null,
        };
      }
    }

    return {
      valid: true,
      reason: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
    };
  }

  /** ライセンスの有効性をチェックする。 */
  verify(): LicenseVerifyResult {
    if (this.licenseInfo === null) {
      this.load();
    }
    const info = this.licenseInfo as LicenseInfo;

    // product_tag が空のときは照合をスキップする（本家と同じ挙動）
    if (info.productTag && info.productTag !== this.productTag) {
      return {
        valid: false,
        reason:
          `ライセンスの product_tag が一致しません` +
          `（期待: '${this.productTag}', 実際: '${info.productTag}'）`,
        inGracePeriod: false,
        graceDaysRemaining: null,
      };
    }

    return info.licenseType === "NL"
      ? this.verifyNamedLicense(info)
      : this.verifyStandardLicense(info);
  }
}

/** ライセンスファイルを読み込み LicenseInfo を返す（署名検証のみ）。 */
export function getLicenseInfo(
  productTag: string = PRODUCT_TAG,
  licenseDir: string = DEFAULT_LICENSE_DIR,
): LicenseInfo {
  return new LicenseFile(productTag, licenseDir).load();
}

// ── ライセンス検証キャッシュ ──────────────────────────────────────────────

function getCacheDir(): string {
  const local =
    process.env.LOCALAPPDATA ||
    join(process.env.HOME || process.env.USERPROFILE || ".", ".local", "share");
  return join(local, "msys_winactor_adapters", "kintone_api_query_creator");
}

function getLicenseCachePath(productTag: string): string {
  return join(getCacheDir(), `${productTag}_license_cache.json`);
}

/** キャッシュが有効かどうかを判定する。 */
function isCacheValid(productTag: string, licenseDir: string): boolean {
  const cachePath = getLicenseCachePath(productTag);
  if (!existsSync(cachePath)) return false;

  let cache: { license_mtime?: number; cached_at?: number };
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return false;
  }

  const licensePath = getLicensePath(productTag, licenseDir);
  if (!existsSync(licensePath)) return false;

  // ライセンスファイルが差し替えられていたらキャッシュを無効化する
  const currentMtime = statSync(licensePath).mtimeMs;
  if (cache.license_mtime === undefined || cache.license_mtime !== currentMtime) {
    return false;
  }

  const cachedAt = cache.cached_at ?? 0;
  return Date.now() / 1000 - cachedAt <= CACHE_TTL_SECONDS;
}

/** 検証成功時にキャッシュを保存する。 */
function saveCache(productTag: string, licenseDir: string): void {
  const licensePath = getLicensePath(productTag, licenseDir);
  const cachePath = getLicenseCachePath(productTag);
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(
    cachePath,
    JSON.stringify({
      license_mtime: statSync(licensePath).mtimeMs,
      cached_at: Date.now() / 1000,
    }),
    "utf-8",
  );
}

/** ライセンス状態（アプリ側が扱いやすい形） */
export interface LicenseStatus {
  /** ライセンスファイルが存在し、署名検証に通ったか */
  found: boolean;
  /** 利用可能か（猶予期間中もtrue） */
  valid: boolean;
  /** 有効期限（ISO文字列）。取得できなければnull */
  expiryDate: string | null;
  licenseType: string | null;
  productName: string | null;
  isMigs: boolean;
  inGracePeriod: boolean;
  graceDaysRemaining: number | null;
  /** 無効な理由、または猶予期間中の警告 */
  message: string | null;
}

/**
 * ライセンスをロードして検証し、状態を返す。
 * 例外は投げず、失敗理由を LicenseStatus に載せて返す。
 *
 * 検証結果は24時間キャッシュし、その間は署名検証をスキップする
 * （ただし有効期限の判定は毎回行う）。
 */
export function checkLicense(
  productTag: string = PRODUCT_TAG,
  licenseDir: string = DEFAULT_LICENSE_DIR,
): LicenseStatus {
  const notFound = (message: string): LicenseStatus => ({
    found: false,
    valid: false,
    expiryDate: null,
    licenseType: null,
    productName: null,
    isMigs: false,
    inGracePeriod: false,
    graceDaysRemaining: null,
    message,
  });

  let licenseFile: LicenseFile;
  let info: LicenseInfo;
  try {
    licenseFile = new LicenseFile(productTag, licenseDir);
    info = licenseFile.load();
  } catch (error) {
    return notFound(error instanceof Error ? error.message : String(error));
  }

  const result = licenseFile.verify();

  if (result.valid) {
    try {
      // キャッシュ済みならmtime更新のみで済むため、書き込み失敗は無視してよい
      if (!isCacheValid(productTag, licenseDir)) {
        saveCache(productTag, licenseDir);
      }
    } catch {
      /* キャッシュ保存の失敗は致命的ではない */
    }
  }

  return {
    found: true,
    valid: result.valid,
    expiryDate: info.expiryDate,
    licenseType: info.licenseType || null,
    productName: info.productName || null,
    isMigs: info.isMigs,
    inGracePeriod: result.inGracePeriod,
    graceDaysRemaining: result.graceDaysRemaining,
    message: result.reason,
  };
}
