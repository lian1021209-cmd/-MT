#!/bin/bash

echo "========================================================"
echo "  地鐵路網繪製器 · 一鍵本地啟動程式 (Metro Network Drawer)"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "【錯誤】您的電腦尚未安裝 Node.js 環境！"
    echo "這是 React 現代前端專案，需要 Node.js 才能在本地運行。"
    echo ""
    echo "請前往官網下載並安裝 Node.js (推薦 LTS 版本)："
    echo "https://nodejs.org/"
    echo ""
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "正在首次安裝專案依賴套件 (npm install)，請稍候 1~2 分鐘..."
    npm install
    if [ $? -ne 0 ]; then
        echo "【錯誤】依賴套件安裝失敗，請檢查網路連線後重試。"
        exit 1
    fi
    echo ""
    echo "依賴套件安裝完成！"
    echo ""
fi

echo "正在啟動本地伺服器..."
echo "啟動後請在瀏覽器開啟 http://localhost:3000"
echo ""

if command -v open &> /dev/null; then
    open http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
fi

npm run dev
