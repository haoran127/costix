@echo off
chcp 65001 >nul
echo ==========================================
echo   完成目录迁移脚本
echo ==========================================
echo.

cd /d D:\code\developer-platform

echo [1/6] 复制 ApiKeys.tsx (大文件)...
if not exist "src\pages" mkdir "src\pages"
copy "store-console\src\pages\ApiKeys.tsx" "src\pages\ApiKeys.tsx" >nul
echo     ✓ src\pages\ApiKeys.tsx

echo [2/6] 复制 supabase 目录...
if not exist "supabase" mkdir "supabase"
xcopy /E /I /Y "store-console\supabase" "supabase" >nul
echo     ✓ supabase\

echo [3/6] 复制 n8n-workflows 目录...
if not exist "n8n-workflows" mkdir "n8n-workflows"
xcopy /E /I /Y "store-console\n8n-workflows" "n8n-workflows" >nul
echo     ✓ n8n-workflows\

echo [4/6] 复制 config 目录...
if not exist "src\config" mkdir "src\config"
if exist "store-console\src\config" (
    xcopy /E /I /Y "store-console\src\config" "src\config" >nul
    echo     ✓ src\config\
) else (
    echo     - src\config\ (原目录为空，跳过)
)

echo [5/6] 复制 pnpm-lock.yaml...
if exist "store-console\pnpm-lock.yaml" (
    copy "store-console\pnpm-lock.yaml" "pnpm-lock.yaml" >nul
    echo     ✓ pnpm-lock.yaml
)

echo [6/6] 复制 .env 文件 (如存在)...
if exist "store-console\.env" (
    copy "store-console\.env" ".env" >nul
    echo     ✓ .env
)
if exist "store-console\.env.local" (
    copy "store-console\.env.local" ".env.local" >nul
    echo     ✓ .env.local
)
if exist "store-console\.env.development" (
    copy "store-console\.env.development" ".env.development" >nul
    echo     ✓ .env.development
)
if exist "store-console\.env.production" (
    copy "store-console\.env.production" ".env.production" >nul
    echo     ✓ .env.production
)

echo.
echo ==========================================
echo   迁移完成！
echo ==========================================
echo.
echo 已完成以下操作:
echo   - 复制所有缺失的源文件
echo   - 复制数据库迁移文件 (supabase)
echo   - 复制工作流文件 (n8n-workflows)
echo   - 复制环境变量文件
echo.
echo 接下来请执行:
echo   1. 删除 store-console 目录: rmdir /S /Q store-console
echo   2. 安装依赖: npm install
echo   3. 启动项目: npm run dev
echo.
pause

