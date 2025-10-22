# コードサイニング設定ガイド

## 概要
このドキュメントでは、kintone API Query CreatorアプリケーションにWindowsコードサイニング証明書を設定する方法を説明します。

## 必要なもの
1. 有効なコードサイニング証明書（.pfxまたは.p12ファイル）
2. 証明書のパスワード

## 設定手順

### 1. 環境変数ファイルの作成
`.env`ファイルをプロジェクトルートに作成し、以下の内容を設定してください：

```env
# Windows Code Signing Configuration
WINDOWS_SIGN_CERT_PATH=path/to/your/certificate.pfx
WINDOWS_SIGN_CERT_PASSWORD=your_certificate_password
WINDOWS_SIGN_CERT_SUBJECT_NAME=Your Company Name
WINDOWS_SIGN_TIMESTAMP_URL=http://timestamp.digicert.com
WINDOWS_SIGN_HASH_ALGORITHM=sha256
```

### 2. 証明書ファイルの配置
コードサイニング証明書ファイル（.pfxまたは.p12）を安全な場所に配置し、`WINDOWS_SIGN_CERT_PATH`にそのパスを設定してください。

### 3. ビルドの実行
環境変数が設定されていれば、通常のビルドコマンドでコードサイニングが自動的に適用されます：

```bash
npm run make
```

## セキュリティ注意事項

1. **証明書ファイルは絶対にGitリポジトリにコミットしないでください**
2. **パスワードは`.env`ファイルに直接書かず、環境変数として設定することを推奨します**
3. **CI/CDパイプラインでは、証明書とパスワードをセキュアな環境変数として設定してください**

## トラブルシューティング

### 問題: コードサイニングが失敗する
- 証明書のパスが正しいか確認してください
- 証明書のパスワードが正しいか確認してください
- 証明書が有効期限内であることを確認してください

### 問題: タイムスタンプエラー
- インターネット接続を確認してください
- タイムスタンプサーバーのURLが正しいか確認してください

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