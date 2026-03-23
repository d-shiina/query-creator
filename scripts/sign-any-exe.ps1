# 任意のEXEファイルに証明書を付与するPowerShellスクリプト
# 使用方法: .\sign-any-exe.ps1 -FilePath "C:\path\to\file.exe"
# または複数ファイル: .\sign-any-exe.ps1 -FilePath "C:\path\to\file1.exe","C:\path\to\file2.exe"

param(
    [Parameter(Mandatory=$true, Position=0, HelpMessage="署名するEXEファイルのパス（複数可）")]
    [string[]]$FilePath,
    
    [Parameter(Mandatory=$false, HelpMessage="証明書のサムプリント（省略時は自動検出または設定値を使用）")]
    [string]$Thumbprint = "",
    
    [Parameter(Mandatory=$false, HelpMessage="タイムスタンプサーバーURL")]
    [string]$TimestampUrl = "http://timestamp.digicert.com",
    
    [Parameter(Mandatory=$false, HelpMessage="signtool.exeのパス（省略時は自動検出）")]
    [string]$SignToolPath = "",
    
    [Parameter(Mandatory=$false, HelpMessage="署名後に検証を行うか")]
    [switch]$Verify = $false
)

# スクリプトのバージョン
$scriptVersion = "1.0.0"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "任意のEXE署名ツール v$scriptVersion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# サムプリントの設定（環境変数 > パラメータ > ハードコード値の優先順位）
if ([string]::IsNullOrEmpty($Thumbprint)) {
    if ($env:CODE_SIGN_THUMBPRINT) {
        $Thumbprint = $env:CODE_SIGN_THUMBPRINT
        Write-Host "環境変数からサムプリントを取得: $Thumbprint" -ForegroundColor Green
    } else {
        # デフォルトのサムプリント（必要に応じて変更してください）
        $Thumbprint = "F54ED66C29666B0315EBB1940CD04234544B1238"
        Write-Host "デフォルトのサムプリントを使用: $Thumbprint" -ForegroundColor Yellow
    }
}

# タイムスタンプURLの設定
if ($env:WINDOWS_SIGN_TIMESTAMP_URL) {
    $TimestampUrl = $env:WINDOWS_SIGN_TIMESTAMP_URL
    Write-Host "環境変数からタイムスタンプURLを取得: $TimestampUrl" -ForegroundColor Green
}

# signtool.exeのパスを自動検出または設定
if ([string]::IsNullOrEmpty($SignToolPath)) {
    # Windows SDK の一般的なパスから検索
    $possiblePaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $SignToolPath = $path
            Write-Host "signtool.exeを検出: $SignToolPath" -ForegroundColor Green
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($SignToolPath)) {
        Write-Host "エラー: signtool.exeが見つかりません。" -ForegroundColor Red
        Write-Host "Windows SDKをインストールするか、-SignToolPathパラメータでパスを指定してください。" -ForegroundColor Red
        exit 1
    }
}

# signtool.exeの存在確認
if (-not (Test-Path $SignToolPath)) {
    Write-Host "エラー: signtool.exeが見つかりません: $SignToolPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "設定情報:" -ForegroundColor Cyan
Write-Host "  サムプリント: $Thumbprint"
Write-Host "  タイムスタンプURL: $TimestampUrl"
Write-Host "  signtoolパス: $SignToolPath"
Write-Host ""

# 署名関数
function Sign-ExecutableFile {
    param(
        [string]$file
    )
    
    Write-Host "処理中: $file" -ForegroundColor White
    
    # ファイルの存在確認
    if (-not (Test-Path $file)) {
        Write-Host "  ✗ ファイルが見つかりません" -ForegroundColor Red
        return $false
    }
    
    # ファイルサイズの表示
    $fileInfo = Get-Item $file
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "  ファイルサイズ: $fileSizeMB MB"
    
    # 既に署名されているかチェック
    try {
        $signature = Get-AuthenticodeSignature $file
        if ($signature.Status -eq "Valid") {
            Write-Host "  ⚠ 既に有効な署名があります" -ForegroundColor Yellow
            Write-Host "    発行者: $($signature.SignerCertificate.Subject)"
            Write-Host "    署名日時: $($signature.TimeStamperCertificate.NotBefore)"
            $response = Read-Host "  上書きしますか? (Y/N)"
            if ($response -ne "Y" -and $response -ne "y") {
                Write-Host "  ⊘ スキップしました" -ForegroundColor Yellow
                return $true
            }
        }
    } catch {
        # 署名情報の取得に失敗した場合は続行
    }
    
    # 署名実行
    Write-Host "  署名中..." -ForegroundColor Cyan
    $signArgs = @(
        "sign",
        "/sha1", $Thumbprint,
        "/s", "My",
        "/fd", "sha256",
        "/tr", $TimestampUrl,
        "/td", "sha256",
        "/v",
        $file
    )
    
    try {
        $output = & $SignToolPath $signArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 署名成功" -ForegroundColor Green
            
            # 署名情報の表示
            $signature = Get-AuthenticodeSignature $file
            Write-Host "    発行者: $($signature.SignerCertificate.Subject)"
            Write-Host "    有効期限: $($signature.SignerCertificate.NotAfter)"
            
            return $true
        } else {
            Write-Host "  ✗ 署名失敗 (終了コード: $LASTEXITCODE)" -ForegroundColor Red
            Write-Host "    エラー詳細:" -ForegroundColor Red
            $output | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
            return $false
        }
    } catch {
        Write-Host "  ✗ 署名中に例外が発生しました" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor Red
        return $false
    }
}

# 検証関数
function Verify-ExecutableFile {
    param(
        [string]$file
    )
    
    Write-Host "検証中: $file" -ForegroundColor White
    
    if (-not (Test-Path $file)) {
        Write-Host "  ✗ ファイルが見つかりません" -ForegroundColor Red
        return $false
    }
    
    $verifyArgs = @(
        "verify",
        "/pa",
        "/v",
        $file
    )
    
    try {
        $output = & $SignToolPath $verifyArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 検証成功" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ 検証失敗 (終了コード: $LASTEXITCODE)" -ForegroundColor Red
            $output | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
            return $false
        }
    } catch {
        Write-Host "  ✗ 検証中に例外が発生しました" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor Red
        return $false
    }
}

# メイン処理
$successCount = 0
$failCount = 0
$totalFiles = $FilePath.Count

Write-Host "署名処理を開始します（$totalFiles ファイル）" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $FilePath) {
    # パスを絶対パスに変換
    $absolutePath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($file)
    
    if (Sign-ExecutableFile -file $absolutePath) {
        $successCount++
        
        # 検証オプションが有効な場合
        if ($Verify) {
            Write-Host ""
            Verify-ExecutableFile -file $absolutePath
        }
    } else {
        $failCount++
    }
    
    Write-Host ""
}

# 結果サマリー
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "処理完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "総ファイル数: $totalFiles"
Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "失敗: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "White" })
Write-Host ""

# 終了コード
if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
