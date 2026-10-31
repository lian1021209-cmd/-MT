@echo off
chcp 65001 >nul
echo ========================================================
echo   地鐵路網繪製器 · 一鍵本地啟動程式 (Metro Network Drawer)
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 【錯誤】您的電腦尚未安裝 Node.js 環境！
    echo 這是 React 現代前端專案，需要 Node.js 才能在本地運行。
    echo.
    echo 請前往官網下載並安裝 Node.js (推薦 LTS 版本)：
    echo https://nodejs.org/
    echo.
    echo 安裝完成後，請重新雙擊執行此 start.bat。
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo 正在首次安裝專案依賴套件 (npm install)，請稍候 1~2 分鐘...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo 【錯誤】依賴套件安裝失敗，請檢查網路連線後重試。
        pause
        exit /b 1
    )
    echo.
    echo 依賴套件安裝完成！
    echo.
)

echo 正在啟動本地伺服器...
echo 啟動後將自動在瀏覽器中開啟 http://localhost:3000
echo.

start http://localhost:3000
npm run dev
pause
