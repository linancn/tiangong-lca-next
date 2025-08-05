#!/bin/bash

# 数据脱敏脚本
# 用于替换data.sql文件中的敏感信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认文件路径
DEFAULT_INPUT_FILE="docker/volumes/db/init/data.sql"
DEFAULT_OUTPUT_FILE="docker/volumes/db/init/data_desensitized.sql"

# 显示帮助信息
show_help() {
    echo "数据脱敏脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -i, --input FILE     输入文件路径 (默认: $DEFAULT_INPUT_FILE)"
    echo "  -o, --output FILE    输出文件路径 (默认: $DEFAULT_OUTPUT_FILE)"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认文件路径"
    echo "  $0 -i input.sql -o output.sql        # 指定输入和输出文件"
    echo ""
}

# 解析命令行参数
INPUT_FILE="$DEFAULT_INPUT_FILE"
OUTPUT_FILE="$DEFAULT_OUTPUT_FILE"

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input)
            INPUT_FILE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 未知选项 $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 检查输入文件是否存在
if [[ ! -f "$INPUT_FILE" ]]; then
    echo -e "${RED}错误: 输入文件 '$INPUT_FILE' 不存在${NC}"
    exit 1
fi

echo -e "${YELLOW}开始数据脱敏处理...${NC}"
echo "输入文件: $INPUT_FILE"
echo "输出文件: $OUTPUT_FILE"
echo ""

# 创建输出目录（如果不存在）
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [[ ! -d "$OUTPUT_DIR" ]]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${GREEN}创建输出目录: $OUTPUT_DIR${NC}"
fi

# 备份原文件
BACKUP_FILE="${INPUT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$INPUT_FILE" "$BACKUP_FILE"
echo -e "${GREEN}已创建备份文件: $BACKUP_FILE${NC}"

# 执行脱敏替换
echo -e "${YELLOW}执行脱敏替换...${NC}"

# 替换 x_key 敏感信息
echo "替换 x_key 敏感信息..."
sed -E 's/"x_key":"[^"]*"/"x_key":"edge-functions-key"/g' "$INPUT_FILE" > "$OUTPUT_FILE"

# 替换 apikey 敏感信息
echo "替换 apikey 敏感信息..."
sed -i '' -E 's/"apikey":"sb_secret_[^"]*"/"apikey":"edge-functions-key"/g' "$OUTPUT_FILE"

# 替换其他可能的敏感信息
echo "替换其他敏感信息..."
sed -i '' -E 's/"x_key":"[^"]*"/"x_key":"edge-functions-key"/g' "$OUTPUT_FILE"

# 检查替换结果
echo ""
echo -e "${YELLOW}检查替换结果...${NC}"

# 检查是否还有敏感信息
SENSITIVE_COUNT=$(grep -c "sb_secret\|1qaZ_Xsw2_Mju7" "$OUTPUT_FILE" 2>/dev/null || echo "0")
if [[ "$SENSITIVE_COUNT" -gt 0 ]]; then
    echo -e "${RED}警告: 发现 $SENSITIVE_COUNT 个可能的敏感信息残留${NC}"
    grep -n "sb_secret\|1qaZ_Xsw2_Mju7" "$OUTPUT_FILE" || true
else
    echo -e "${GREEN}✓ 所有敏感信息已成功替换${NC}"
fi

# 显示替换统计
echo ""
echo -e "${GREEN}脱敏处理完成!${NC}"
echo "原始文件: $INPUT_FILE"
echo "脱敏文件: $OUTPUT_FILE"
echo "备份文件: $BACKUP_FILE"

# 显示文件大小对比
ORIGINAL_SIZE=$(wc -c < "$INPUT_FILE")
DESENSITIZED_SIZE=$(wc -c < "$OUTPUT_FILE")
echo ""
echo "文件大小对比:"
echo "  原始文件: $ORIGINAL_SIZE 字节"
echo "  脱敏文件: $DESENSITIZED_SIZE 字节"

echo ""
echo -e "${YELLOW}建议:${NC}"
echo "1. 检查脱敏文件确保所有敏感信息已正确替换"
echo "2. 将脱敏文件重命名为 data.sql 以替换原文件"
echo "3. 确保备份文件安全存储"
echo ""
echo "如需替换原文件，请运行:"
echo "  mv $OUTPUT_FILE $INPUT_FILE" 