# MOUSE BREEDING SIMULATOR - QUICK START GUIDE

## Running the Backend API

### Option 1: Double-Click (Easiest!)
1. Navigate to the `backend` folder
2. Double-click `start_server.bat`
3. Wait for "Application startup complete"
4. Server is running at http://localhost:8000

### Option 2: Command Line
```bash
cd backend
python run.py
```

### Option 3: Direct Uvicorn
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Verify Backend is Running

### Method 1: Browser
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

### Method 2: Interactive Documentation
Open: http://localhost:8000/docs

You'll see Swagger UI with all 24 endpoints!

### Method 3: Health Check
Open: http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-16T...",
  "populations": 0,
  "mice": 0
}
```

## Connecting Your Frontend

In your frontend code, set:
```javascript
const API_BASE_URL = "http://localhost:8000";

// Example: Create a population
fetch(`${API_BASE_URL}/api/population/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    size: 30,
    mode: "sim",
    goal: { "size": "large", "temperament": "friendly" }
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## Quick API Test

### Test 1: Create a Population
```bash
curl -X POST http://localhost:8000/api/population/create \
  -H "Content-Type: application/json" \
  -d "{\"size\": 30, \"mode\": \"sim\", \"goal\": {\"size\": \"large\"}}"
```

### Test 2: Breed Two Mice
```bash
curl -X POST http://localhost:8000/api/breed \
  -H "Content-Type: application/json" \
  -d "{\"parent1_id\": 0, \"parent2_id\": 1, \"n_offspring\": 4}"
```

### Test 3: Run Validation
```bash
curl http://localhost:8000/api/validate/mendelian
```

## Common Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/docs` | GET | Interactive API documentation |
| `/api/population/create` | POST | Create new mouse population |
| `/api/breed` | POST | Breed two mice |
| `/api/genetics/grm` | POST | Compute genomic relationships |
| `/api/validate/all` | GET | Run all validation tests |
| `/api/real/strains` | GET | List available mouse strains |

## Troubleshooting

### Server Won't Start
**Problem:** Port 8000 already in use

**Solution:** Use a different port
```bash
set API_PORT=8001
python run.py
```

### Module Not Found
**Problem:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:** Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### CORS Errors in Frontend
**Problem:** Frontend can't connect to backend

**Solution:** Backend already has CORS enabled for all origins. Make sure:
1. Backend is running on http://localhost:8000
2. Frontend is using the correct URL
3. Check browser console for actual error

### Database Errors
**Problem:** SQLite errors

**Solution:** Delete the database and restart
```bash
cd backend
del mouse_breeding.db
python run.py
```

## Project Structure

```
mouse-breeding/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application (24 endpoints)
│   │   ├── database.py          # SQLite database models
│   │   ├── schemas.py           # Request/response models
│   │   └── services/
│   │       └── genetics_service.py  # Business logic
│   ├── datasets/                # Mouse Phenome Database data
│   ├── gene_models.json         # Gene configurations
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Startup script
│   ├── start_server.bat         # Windows startup (double-click!)
│   └── START_BACKEND.md         # Detailed backend guide
├── mouse-breeder.py             # Core simulation engine (3,471 lines)
├── run_validation.py            # Quick validation script
└── QUICK_START_GUIDE.md         # This file
```

## Next Steps

1. **Start Backend:** `cd backend && python run.py`
2. **Test API:** Open http://localhost:8000/docs
3. **Start Frontend:** Run your frontend application
4. **Connect:** Point frontend to http://localhost:8000
5. **Breed Mice:** Use the API endpoints!

## Need Help?

- **API Documentation:** http://localhost:8000/docs (when server is running)
- **Backend Details:** See `backend/START_BACKEND.md`
- **API Reference:** See `backend/API_DOCUMENTATION.md`
- **Deployment Guide:** See `backend/DEPLOYMENT_GUIDE.md`

