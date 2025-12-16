@echo off
echo ================================================================================
echo MOUSE BREEDING SIMULATOR - BACKEND API
echo ================================================================================
echo.
echo Starting server...
echo.
echo Once started, access the API at:
echo   - API Base: http://localhost:8000
echo   - Interactive Docs: http://localhost:8000/docs
echo   - Health Check: http://localhost:8000/health
echo.
echo Press CTRL+C to stop the server
echo ================================================================================
echo.

cd /d "%~dp0"
python run.py

pause

