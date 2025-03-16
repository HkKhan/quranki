#!/bin/bash

# Load production environment variables
set -a
source .env.production.local
set +a

# Run the test
echo "Running RDS connection test..."
npx ts-node scripts/test-rds-connection.ts 