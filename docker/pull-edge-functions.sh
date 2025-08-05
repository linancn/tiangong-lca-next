#!/bin/bash

# 设置错误时退出
set -e

echo "开始更新 Edge Functions..."

# 创建临时目录
mkdir -p temp_repo

# 备份现有函数（如果存在）
if [ -d "volumes/functions" ]; then
    echo "备份现有的 Docker functions..."
    cp -r volumes/functions volumes/functions.backup.$(date +%Y%m%d_%H%M%S)
fi

if [ -d "../supabase/functions" ]; then
    echo "备份现有的 Supabase functions..."
    cp -r ../supabase/functions ../supabase/functions.backup.$(date +%Y%m%d_%H%M%S)
fi

# 克隆 Edge Functions 仓库
echo "克隆 Edge Functions 仓库..."
git clone --depth 1 https://github.com/linancn/tiangong-lca-edge-functions.git temp_repo

# 检查克隆是否成功
if [ ! -d "temp_repo/supabase/functions" ]; then
    echo "错误：无法找到 Edge Functions 目录"
    rm -rf temp_repo
    exit 1
fi

# 确保目标目录存在
mkdir -p volumes/functions
mkdir -p ../supabase/functions

# 将 Edge Functions 复制到 Docker 数据卷目录
echo "更新 Docker functions..."
cp -r temp_repo/supabase/functions/* volumes/functions/

# 将 Edge Functions 复制到本地 Supabase 目录
echo "更新 Supabase functions..."
cp -r temp_repo/supabase/functions/* ../supabase/functions/

# 清理临时目录
echo "清理临时文件..."
rm -rf temp_repo

echo "Edge Functions 更新完成！"
echo "注意：原有函数已备份到 .backup 目录中"