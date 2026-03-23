# コードサイニング用 PowerShell スクリプト
Write-Host "Starting code signing process for ZIP distribution..."

# サムプリントをハードコード
$thumbprint = "F54ED66C29666B0315EBB1940CD04234544B1238"
$timestampUrl = $env:WINDOWS_SIGN_TIMESTAMP_URL
if (-not $timestampUrl) { $timestampUrl = "http://timestamp.digicert.com" }

# 署名対象ファイル
$outDir = "out"
$exePath = Join-Path $outDir "kintone API Query Creator-win32-x64\kintone-api-query-creator.exe"
$squirrelPath = Join-Path $outDir "kintone API Query Creator-win32-x64\Squirrel.exe"
$setupPath = Join-Path $outDir "make\squirrel.windows\x64\kintone API Query Creator-1.0.0 Setup.exe"

# signtoolのパス（ユーザー指定）
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe"

function Sign-File($file) {
    if (Test-Path $file) {
        & $signtool sign /sha1 $thumbprint /fd sha256 /tr $timestampUrl /td sha256 $file
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully signed: $file"
        } else {
            Write-Host "Failed to sign: $file"
        }
    } else {
        Write-Host "File not found: $file"
    }
}

Sign-File $exePath
Sign-File $squirrelPath
Sign-File $setupPath

Write-Host "Code signing process completed."
