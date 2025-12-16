# START SERVER MANUALLY

## ISSUE DETECTED

The automated server startup is encountering issues with the PowerShell environment.

## MANUAL STARTUP INSTRUCTIONS

### Option 1: Use the Batch File (Easiest)
1. Open File Explorer
2. Navigate to: `D:\WORKSPACE\PERSONAL\PORTOFOLIO\ACADEMIC\mouse-breeding\backend`
3. Double-click: `start_server.bat`
4. A command window will open showing the server status

### Option 2: Use Command Prompt
1. Press `Win + R`
2. Type: `cmd`
3. Press Enter
4. Run these commands:
```cmd
cd /d D:\WORKSPACE\PERSONAL\PORTOFOLIO\ACADEMIC\mouse-breeding\backend
python run.py
```

### Option 3: Use PowerShell (New Window)
1. Press `Win + X`
2. Select "Windows PowerShell" or "Terminal"
3. Run these commands:
```powershell
cd D:\WORKSPACE\PERSONAL\PORTOFOLIO\ACADEMIC\mouse-breeding\backend
python run.py
```

### Option 4: Use VS Code Terminal
1. In VS Code, press `` Ctrl + ` `` (backtick) to open terminal
2. Click the `+` button to open a NEW terminal
3. Run:
```bash
cd backend
python run.py
```

## EXPECTED OUTPUT

When the server starts successfully, you should see:

```
================================================================================
MOUSE BREEDING SIMULATOR API
================================================================================
Starting server on http://localhost:8000
API Documentation: http://localhost:8000/docs
Alternative Docs: http://localhost:8000/redoc
================================================================================
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## VERIFY SERVER IS RUNNING

### Method 1: Open in Browser
Open: http://localhost:8000

You should see:
```json
{
  "status": "online",
  "service": "Mouse Breeding Simulator API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### Method 2: Check Health
Open: http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-16T...",
  "populations": 0,
  "mice": 0
}
```

### Method 3: Open API Docs
Open: http://localhost:8000/docs

You should see the interactive Swagger UI with all 24 endpoints.

## AFTER SERVER IS RUNNING

Once the server is running, you can test all endpoints by running:

```bash
python test_all_endpoints.py
```

This will test all 14 main endpoints and show you which ones pass or fail.

## TROUBLESHOOTING

### Port Already in Use
If you see "Address already in use":
1. Find the process using port 8000:
```powershell
netstat -ano | findstr :8000
```
2. Kill the process (replace PID with the number from above):
```powershell
taskkill /PID <PID> /F
```
3. Try starting the server again

### Module Not Found
If you see "ModuleNotFoundError":
```bash
cd backend
pip install -r requirements.txt
```

### Python Not Found
If you see "python is not recognized":
1. Make sure Python is installed
2. Try using `python3` instead of `python`
3. Or use the full path to Python

## NEXT STEPS

1. Start the server using one of the methods above
2. Verify it's running by opening http://localhost:8000
3. Run the test script: `python test_all_endpoints.py`
4. Start the frontend: `cd client && npm run dev`
5. Open http://localhost:5173 in your browser

## NEED HELP?

If the server still won't start:
1. Check if port 8000 is already in use
2. Try using a different port:
   ```bash
   set API_PORT=8001
   python run.py
   ```
3. Check the error messages in the terminal
4. Make sure all dependencies are installed

