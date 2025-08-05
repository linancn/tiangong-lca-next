#!/bin/bash

# Data desensitization script
# Used to replace sensitive information in data.sql

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default file paths
DEFAULT_INPUT_FILE="docker/volumes/db/init/data.sql"
DEFAULT_OUTPUT_FILE="docker/volumes/db/init/data_desensitized.sql"

# Show help information
show_help() {
    echo "Data Desensitization Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -i, --input FILE     Input file path (default: $DEFAULT_INPUT_FILE)"
    echo "  -o, --output FILE    Output file path (default: $DEFAULT_OUTPUT_FILE)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use default file paths"
    echo "  $0 -i input.sql -o output.sql         # Specify input and output files"
    echo ""
}

# Parse command line arguments
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
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Check if input file exists
if [[ ! -f "$INPUT_FILE" ]]; then
    echo -e "${RED}Error: Input file '$INPUT_FILE' does not exist${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting data desensitization...${NC}"
echo "Input file: $INPUT_FILE"
echo "Output file: $OUTPUT_FILE"
echo ""

# Create output directory if it does not exist
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [[ ! -d "$OUTPUT_DIR" ]]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${GREEN}Created output directory: $OUTPUT_DIR${NC}"
fi

# Backup original file
BACKUP_FILE="${INPUT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$INPUT_FILE" "$BACKUP_FILE"
echo -e "${GREEN}Backup file created: $BACKUP_FILE${NC}"

# Perform desensitization replacements
echo -e "${YELLOW}Performing desensitization replacements...${NC}"

# Replace x_key sensitive information
echo "Replacing x_key sensitive information..."
sed -E 's/"x_key":"[^"]*"/"x_key":"edge-functions-key"/g' "$INPUT_FILE" > "$OUTPUT_FILE"

# Replace apikey sensitive information
echo "Replacing apikey sensitive information..."
sed -i '' -E 's/"apikey":"sb_secret_[^"]*"/"apikey":"edge-functions-key"/g' "$OUTPUT_FILE"

# Replace other possible sensitive information
echo "Replacing other sensitive information..."
sed -i '' -E 's/"x_key":"[^"]*"/"x_key":"edge-functions-key"/g' "$OUTPUT_FILE"

# Check replacement results
echo ""
echo -e "${YELLOW}Checking replacement results...${NC}"

# Check if any sensitive information remains
SENSITIVE_COUNT=$(grep -c "sb_secret\|1qaZ_Xsw2_Mju7" "$OUTPUT_FILE" 2>/dev/null || echo "0")
if [[ "$SENSITIVE_COUNT" -gt 0 ]]; then
    echo -e "${RED}Warning: Found $SENSITIVE_COUNT possible sensitive information remnants${NC}"
    grep -n "sb_secret\|1qaZ_Xsw2_Mju7" "$OUTPUT_FILE" || true
else
    echo -e "${GREEN}✓ All sensitive information has been successfully replaced${NC}"
fi

# Show replacement statistics
echo ""
echo -e "${GREEN}Desensitization completed!${NC}"
echo "Original file: $INPUT_FILE"
echo "Desensitized file: $OUTPUT_FILE"
echo "Backup file: $BACKUP_FILE"

# Show file size comparison
ORIGINAL_SIZE=$(wc -c < "$INPUT_FILE")
DESENSITIZED_SIZE=$(wc -c < "$OUTPUT_FILE")
echo ""
echo "File size comparison:"
echo "  Original file: $ORIGINAL_SIZE bytes"
echo "  Desensitized file: $DESENSITIZED_SIZE bytes"

echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo "1. Check the desensitized file to ensure all sensitive information has been properly replaced"
echo "2. Rename the desensitized file to data.sql to replace the original file"
echo "3. Ensure the backup file is stored safely"
echo ""
echo "To replace the original file, run:"
echo "  mv $OUTPUT_FILE $INPUT_FILE" 