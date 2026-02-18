#!/bin/bash

# Deployment script for English Course Platform
# This script helps deploy to GitHub and Vercel

set -e

echo "🚀 Starting deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Run: git init"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Committing them..."
    git add .
    git commit -m "Update before deployment"
fi

# Check if remote is set
if ! git remote | grep -q origin; then
    echo "📦 Setting up GitHub remote..."
    echo "Please provide your GitHub repository URL:"
    read -r GITHUB_URL
    git remote add origin "$GITHUB_URL"
fi

echo "📤 Pushing to GitHub..."
git push -u origin "$CURRENT_BRANCH" || {
    echo "❌ Failed to push to GitHub. Please check your credentials."
    echo "You may need to:"
    echo "  1. Set up SSH keys, or"
    echo "  2. Use GitHub CLI: gh auth login"
    exit 1
}

echo "✅ Successfully pushed to GitHub!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null || [ -f "node_modules/.bin/vercel" ]; then
    npx vercel --prod --yes || {
        echo "⚠️  Vercel deployment failed. You can deploy manually:"
        echo "   1. Go to https://vercel.com/new"
        echo "   2. Import your GitHub repository"
        echo "   3. Add environment variables"
    }
else
    echo "⚠️  Vercel CLI not found. Please deploy manually:"
    echo "   1. Go to https://vercel.com/new"
    echo "   2. Import your GitHub repository"
    echo "   3. Add environment variables (see DEPLOYMENT.md)"
fi

echo "✨ Deployment process complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update Supabase URL Configuration with your Vercel URL"
echo "   2. Test all features on production"
echo "   3. Check environment variables in Vercel dashboard"




