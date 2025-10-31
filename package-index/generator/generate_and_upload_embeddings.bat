@echo off
echo ======================================================================
echo  SAVVY Package Index - Embeddings Generation and Upload
echo ======================================================================
echo.

REM Check if GITHUB_TOKEN is set
if "%GITHUB_TOKEN%"=="" (
    echo ERROR: GITHUB_TOKEN environment variable is not set!
    echo Please set it with: set GITHUB_TOKEN=your_token_here
    pause
    exit /b 1
)

REM Set default values
if "%GITHUB_OWNER%"=="" set GITHUB_OWNER=trevorjbennett
if "%GITHUB_REPO%"=="" set GITHUB_REPO=savvy_systems
if "%OUTPUT_DIR%"=="" set OUTPUT_DIR=.

echo Configuration:
echo   GITHUB_OWNER: %GITHUB_OWNER%
echo   GITHUB_REPO: %GITHUB_REPO%
echo   OUTPUT_DIR: %OUTPUT_DIR%
echo   GITHUB_TOKEN: [SET]
echo.

echo ======================================================================
echo Step 1: Generating Embeddings
echo ======================================================================
python scraper_embeddings.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Embedding generation failed!
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo Step 2: Uploading Embeddings to GitHub Release
echo ======================================================================
python upload_embeddings.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Upload failed!
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo Success! Embeddings generated and uploaded.
echo ======================================================================
echo.
echo Your SAVVY app will now have AI-powered semantic search!
echo.
pause
