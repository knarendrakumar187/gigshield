#!/bin/bash

# GigShield Frontend Deployment Script
# This script builds and deploys the frontend for production

set -e

echo "🚀 Starting GigShield Frontend Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run tests if they exist
if [ -f "package.json" ] && grep -q "test" package.json; then
    echo "🧪 Running tests..."
    npm test
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Build output is available in the 'dist' directory"

# Show build stats
echo "📊 Build statistics:"
du -sh dist/
find dist -name "*.js" -o -name "*.css" | wc -l | xargs echo "Total files:"

echo "🎉 Deployment ready!"
echo ""
echo "To deploy:"
echo "1. Copy the 'dist' folder to your web server"
echo "2. Configure your web server to serve index.html for all routes (SPA)"
echo "3. Ensure the backend API is accessible at the configured URL"
echo ""
echo "Example nginx configuration:"
echo "location / {"
echo "    try_files \$uri \$uri/ /index.html;"
echo "}"
echo ""
echo "location /api {"
echo "    proxy_pass http://localhost:8000;"
echo "}"
