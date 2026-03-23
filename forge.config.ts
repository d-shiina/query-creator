import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
// import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./assets/icons/win/icon",
    name: "kintone API Query Creator",
    executableName: "kintone-api-query-creator",
    appBundleId: "com.kintone.query-creator",
    appCopyright: "Copyright © 2025 marubeni-idigio.com",
    // Windows用のコードサイニング設定
    win32metadata: {
      CompanyName: "Marubeni Information Systems Co.,Ltd.",
      FileDescription: "kintone API Query Creator",
      OriginalFilename: "kintone-api-query-creator.exe",
      ProductName: "kintone API Query Creator",
      InternalName: "kintone-api-query-creator"
    },
    // コードサイニングは外部スクリプト（sign-files.bat）で処理
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "kintone-api-query-creator",
      setupIcon: "./assets/icons/win/icon.ico",
      loadingGif: undefined, // ローディングGIFを無効化
      noMsi: true, // MSIファイルを作成しない
      // コードサイニング設定（サムプリント使用）
      // 注意: signtoolが必要です。Windows SDKをインストールしてください
      signWithParams: process.env.WINDOWS_SIGN_CERT_THUMBPRINT ? 
        `/sha1 "${process.env.WINDOWS_SIGN_CERT_THUMBPRINT}" /fd ${process.env.WINDOWS_SIGN_HASH_ALGORITHM || 'sha256'} /tr ${process.env.WINDOWS_SIGN_TIMESTAMP_URL || 'http://timestamp.digicert.com'} /td sha256` : 
        undefined,
    }),
    new MakerZIP({}),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
