@echo off
REM GigShield Frontend Deployment Script for Windows
REM This script builds and deploys the frontend for production

echo 🚀 Starting GigShield Frontend Deployment...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm ci --only=production

REM Run tests if they exist
if exist package.json (
    findstr /C:"test" package.json >nul
    if %errorlevel% equ 0 (
        echo 🧪 Running tests...
        npm test
    )
)

REM Build the application
echo 🔨 Building application...
npm run build

REM Check if build was successful
if not exist "dist" (
    echo ❌ Build failed - dist directory not found
    exit /b 1
)

echo ✅ Build completed successfully!
echo 📁 Build output is available in the 'dist' directory

REM Show build stats
echo 📊 Build statistics:
dir dist | findstr /C:"bytes"
echo Total files:
dir /s /b dist\*.js dist\*.css | find /c /v ""

echo 🎉 Deployment ready!
echo.
echo To deploy:
echo 1. Copy the 'dist' folder to your web server
echo 2. Configure your web server to serve index.html for all routes (SPA)
echo 3. Ensure the backend API is accessible at the configured URL
echo.
echo Example nginx configuration:
echo location / {
echo     try_files $uri $uri/ /index.html;
echo }
echo.
echo location /api {
echo     proxy_pass http://localhost:8000;
echo }

pause
