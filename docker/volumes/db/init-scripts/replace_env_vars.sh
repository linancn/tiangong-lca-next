#!/bin/bash
set -e

echo "Running replace_env_vars.sh script to substitute environment variables in SQL files..."

# 使用sed替换SQL文件中的环境变量
if [ -f /docker-entrypoint-initdb.d/migrations/data.sql ]; then
    echo "Processing /docker-entrypoint-initdb.d/migrations/data.sql..."
    
    # 创建一个临时文件
    cp /docker-entrypoint-initdb.d/migrations/data.sql /tmp/data.sql.tmp
    
    # 替换所有可能的环境变量
    # 这里列出所有需要替换的环境变量
    sed -i "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_DB}|$POSTGRES_DB|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_HOST}|$POSTGRES_HOST|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_PORT}|$POSTGRES_PORT|g" /tmp/data.sql.tmp
    sed -i "s|\${JWT_SECRET}|$JWT_SECRET|g" /tmp/data.sql.tmp
    sed -i "s|\${JWT_EXPIRY}|$JWT_EXPIRY|g" /tmp/data.sql.tmp
    sed -i "s|\${X_KEY}|$X_KEY|g" /tmp/data.sql.tmp
    # 如果有其他环境变量需要替换，请在这里添加更多的sed命令
    
    # 将处理后的文件内容写回原文件
    cat /tmp/data.sql.tmp > /docker-entrypoint-initdb.d/migrations/data.sql
    rm /tmp/data.sql.tmp
    
    echo "Environment variable substitution completed for data.sql"
else
    echo "Warning: /docker-entrypoint-initdb.d/migrations/data.sql not found"
fi

# 脚本结束，不需要启动PostgreSQL
echo "replace_env_vars.sh script completed" 