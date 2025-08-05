#!/bin/bash

# Exit on error
set -e

echo "Starting Edge Functions update..."

# Create temporary directory
mkdir -p temp_repo

# Backup existing functions (if any)
if [ -d "volumes/functions" ]; then
    echo "Backing up existing Docker functions..."
    cp -r volumes/functions volumes/functions.backup.$(date +%Y%m%d_%H%M%S)
fi

if [ -d "../supabase/functions" ]; then
    echo "Backing up existing Supabase functions..."
    cp -r ../supabase/functions ../supabase/functions.backup.$(date +%Y%m%d_%H%M%S)
fi

# Clone Edge Functions repository
echo "Cloning Edge Functions repository..."
git clone --depth 1 https://github.com/linancn/tiangong-lca-edge-functions.git temp_repo

# Check if clone was successful
if [ ! -d "temp_repo/supabase/functions" ]; then
    echo "Error: Could not find Edge Functions directory"
    rm -rf temp_repo
    exit 1
fi

# Ensure target directories exist
mkdir -p volumes/functions
mkdir -p ../supabase/functions

# Copy Edge Functions to Docker volumes directory
echo "Updating Docker functions..."
cp -r temp_repo/supabase/functions/* volumes/functions/

# Copy Edge Functions to local Supabase directory
echo "Updating Supabase functions..."
cp -r temp_repo/supabase/functions/* ../supabase/functions/

# Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf temp_repo

echo "Edge Functions update completed!"
echo "Note: Original functions have been backed up to the .backup directory"