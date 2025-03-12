#!/bin/bash

# Script to push to GitHub and deploy to Vercel production

# Check if a commit message was provided
if [ "$#" -ne 1 ]; then
    echo "Usage: ./push-to-prod.sh \"Your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

# Add all changes
git add .

# Commit with the provided message
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub
git push origin main

# Deploy to Vercel production
vercel deploy --prod

echo "✅ Changes pushed to GitHub and deployed to Vercel production!" 