@echo off
REM Windows Code Signing Script for kintone API Query Creator
REM このスクリプトはビルド後にファイルにコードサイニングを適用します

echo Starting code signing process...

REM PATHにsigntoolを追加
set PATH=%PATH%;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\

REM 署名するファイルのパス
set APP_EXE="out\kintone API Query Creator-win32-x64\kintone-query-creator.exe"
set SQUIRREL_EXE="out\kintone API Query Creator-win32-x64\Squirrel.exe"
set SETUP_EXE="out\make\squirrel.windows\x64\kintone API Query Creator-1.0.0 Setup.exe"

REM 証明書情報
set THUMBPRINT=F54ED66C29666B0315EBB1940CD04234544B1238
set TIMESTAMP_URL=http://timestamp.digicert.com

echo Signing main application...
if exist %APP_EXE% (
    signtool sign /sha1 "%THUMBPRINT%" /fd sha256 /tr %TIMESTAMP_URL% /td sha256 %APP_EXE%
    if %ERRORLEVEL% == 0 (
        echo Successfully signed: %APP_EXE%
    ) else (
        echo Failed to sign: %APP_EXE%
    )
) else (
    echo File not found: %APP_EXE%
)

echo Signing Squirrel.exe...
if exist %SQUIRREL_EXE% (
    signtool sign /sha1 "%THUMBPRINT%" /fd sha256 /tr %TIMESTAMP_URL% /td sha256 %SQUIRREL_EXE%
    if %ERRORLEVEL% == 0 (
        echo Successfully signed: %SQUIRREL_EXE%
    ) else (
        echo Failed to sign: %SQUIRREL_EXE%
    )
) else (
    echo File not found: %SQUIRREL_EXE%
)

echo Signing installer...
if exist %SETUP_EXE% (
    signtool sign /sha1 "%THUMBPRINT%" /fd sha256 /tr %TIMESTAMP_URL% /td sha256 %SETUP_EXE%
    if %ERRORLEVEL% == 0 (
        echo Successfully signed: %SETUP_EXE%
    ) else (
        echo Failed to sign: %SETUP_EXE%
    )
) else (
    echo File not found: %SETUP_EXE%
)

echo Code signing process completed.
pause