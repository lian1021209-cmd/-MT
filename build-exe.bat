@echo off
chcp 65001 >nul
echo ========================================================
echo   地鐵路網繪製器 · 一鍵打包 Windows EXE 軟體 (Build EXE)
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 【錯誤】您的電腦尚未安裝 Node.js 環境！
    echo 請先前往官網安裝：https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 正在安裝必要依賴套件...
call npm install

echo.
echo [2/3] 正在編譯前端應用程式 (npm run build)...
call npm run build

echo.
echo [3/3] 正在將專案打包為 Windows .exe 綠色免安裝軟體...
echo 首次打包時會自動下載 Windows 打包組件，請保持網路連線並稍候片刻...
call npx --yes electron-builder --win portable --config.appId="com.metro.network" --config.productName="地鐵路網繪製器" --config.directories.output="dist-exe"

if %ERRORLEVEL% neq 0 (
    echo.
    echo 【提示】如果打包出現網路連線逾時，推薦使用免安裝的「PWA 桌面安裝」方式！
    echo 只要在瀏覽器打開網址，點擊「安裝」即可秒速變成獨立桌面應用程式！
) else (
    echo.
    echo ========================================================
    echo  🎉 恭喜！Windows EXE 軟體已成功生成！
    echo  檔案位置：dist-exe\地鐵路網繪製器.exe
    echo  此為獨立綠色軟體，雙擊即可獨立開啟使用！
    echo ========================================================
    if exist "dist-exe\" explorer dist-exe
)

pause
