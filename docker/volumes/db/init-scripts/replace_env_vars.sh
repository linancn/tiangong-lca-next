#!/bin/bash
set -e

echo "Running replace_env_vars.sh script to substitute environment variables in SQL files..."

# To replace the environment variables in the SQL files
if [ -f /docker-entrypoint-initdb.d/migrations/data.sql ]; then
    echo "Processing /docker-entrypoint-initdb.d/migrations/data.sql..."
    
    # Create a temporary file
    cp /docker-entrypoint-initdb.d/migrations/data.sql /tmp/data.sql.tmp
    
    # Replace all possible environment variables
    # Here is the list of all environment variables that need to be replaced
    sed -i "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_DB}|$POSTGRES_DB|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_HOST}|$POSTGRES_HOST|g" /tmp/data.sql.tmp
    sed -i "s|\${POSTGRES_PORT}|$POSTGRES_PORT|g" /tmp/data.sql.tmp
    sed -i "s|\${JWT_SECRET}|$JWT_SECRET|g" /tmp/data.sql.tmp
    sed -i "s|\${JWT_EXPIRY}|$JWT_EXPIRY|g" /tmp/data.sql.tmp
    sed -i "s|\${X_KEY}|$X_KEY|g" /tmp/data.sql.tmp
    # If there are other environment variables that need to be replaced, please add more sed commands here
    
    # Write the processed file content back to the original file
    cat /tmp/data.sql.tmp > /docker-entrypoint-initdb.d/migrations/data.sql
    rm /tmp/data.sql.tmp
    
    echo "Environment variable substitution completed for data.sql"
else
    echo "Warning: /docker-entrypoint-initdb.d/migrations/data.sql not found"
fi

echo "replace_env_vars.sh script completed" 