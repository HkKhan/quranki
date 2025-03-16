#!/bin/bash

# Load production environment variables
set -a
source .env.production.local
set +a

# Set the database URL for RDS
export DATABASE_URL="postgresql://qurankiadmin:QuranKi2024!DB@quranki-prod-db.cvbck7tsdtdp.us-east-1.rds.amazonaws.com:5432/qurankidb?sslmode=require"

# Reset and deploy database migrations
echo "Resetting and deploying database migrations to RDS..."
npx prisma migrate reset --force

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

echo "Database deployment complete!" 