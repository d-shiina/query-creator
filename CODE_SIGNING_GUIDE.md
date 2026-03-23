# コードサイニング設定ガイド（ZIP配布版）

## 概要
このドキュメントでは、kintone API Query CreatorアプリケーションのZIP配布版にWindowsコードサイニング証明書を適用する方法を説明します。

## 必要なもの
1. 有効なコードサイニング証明書（証明書ストアにインストール済み）
2. Windows SDK（signtool.exe）

## 設定手順

### 1. 証明書の準備
証明書をWindowsの証明書ストアにインストールし、サムプリントを確認してください。

### 2. 環境変数の設定（オプション）
PowerShellまたはシステム環境変数で設定：

```powershell
$env:WINDOWS_SIGN_CERT_THUMBPRINT = "YOUR_CERTIFICATE_THUMBPRINT"
$env:WINDOWS_SIGN_TIMESTAMP_URL = "http://timestamp.digicert.com"
```

### 3. ビルドと署名の実行

```bash
# ビルドと署名を同時実行
npm run make:signed

# または個別実行
npm run make     # ビルドのみ
npm run sign     # 署名のみ
```

## ZIP配布でのコードサイニング

1. `npm run make` でアプリケーションをビルド
2. `npm run sign` で `out/kintone API Query Creator-win32-x64/kintone-query-creator.exe` に署名
3. `out/make/zip/` のZIPファイルを配布

## スクリプト設定

コードサイニングスクリプト: `scripts/sign-files.ps1`
- デフォルト証明書サムプリント: `F54ED66C29666B0315EBB1940CD04234544B1238`
- 環境変数 `WINDOWS_SIGN_CERT_THUMBPRINT` で上書き可能

## トラブルシューティング

### 問題: PowerShell実行ポリシーエラー
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 問題: signtool.exeが見つからない
Windows SDKをインストールするか、`scripts/sign-files.ps1`内のパスを更新してください。

### 問題: 証明書が見つからない
```powershell
# 証明書ストアの確認
Get-ChildItem -Path Cert:\CurrentUser\My
Get-ChildItem -Path Cert:\LocalMachine\My
```

## 推奨設定

### タイムスタンプサーバー
以下のタイムスタンプサーバーが利用可能です：
- `http://timestamp.digicert.com`
- `http://timestamp.comodoca.com`
- `http://timestamp.verisign.com/scripts/timstamp.dll`

### ハッシュアルゴリズム
`sha256`の使用を強く推奨します（セキュリティ上の理由）。

## 本番環境での使用

本番環境やCI/CDパイプラインでは、以下のように環境変数を設定してください：

```bash
# Windows環境での設定例
set WINDOWS_SIGN_CERT_PATH=C:\path\to\certificate.pfx
set WINDOWS_SIGN_CERT_PASSWORD=your_password

# PowerShellでの設定例
$env:WINDOWS_SIGN_CERT_PATH="C:\path\to\certificate.pfx"
$env:WINDOWS_SIGN_CERT_PASSWORD="your_password"
```