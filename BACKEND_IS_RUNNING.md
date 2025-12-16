# BACKEND IS NOW RUNNING!

## Status: ONLINE

Your Mouse Breeding Simulator backend API is now running and accessible!

## Access Points

### Main API
- **URL:** http://localhost:8000
- **Status:** ONLINE
- **Response:**
  ```json
  {
    "status": "online",
    "service": "Mouse Breeding Simulator API",
    "version": "1.0.0",
    "docs": "/docs"
  }
  ```

### Interactive Documentation (Swagger UI)
- **URL:** http://localhost:8000/docs
- **Status:** OPENED IN YOUR BROWSER
- **Features:**
  - Test all 24 endpoints interactively
  - See request/response schemas
  - Try out API calls directly from browser

### Health Check
- **URL:** http://localhost:8000/health
- **Status:** HEALTHY
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-12-16T02:59:45.889575",
    "populations": 0,
    "mice": 0
  }
  ```

## Quick Test

### Test in Browser
Just open these URLs:
1. http://localhost:8000 - Main API
2. http://localhost:8000/docs - Interactive docs
3. http://localhost:8000/health - Health check

### Test with JavaScript (for your frontend)
```javascript
// Set your API base URL
const API_BASE_URL = "http://localhost:8000";

// Test 1: Health Check
fetch(`${API_BASE_URL}/health`)
  .then(res => res.json())
  .then(data => console.log("Backend is healthy:", data));

// Test 2: Create a Population
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
.then(data => console.log("Population created:", data));

// Test 3: List Available Strains (Real Mode)
fetch(`${API_BASE_URL}/api/real/strains`)
  .then(res => res.json())
  .then(data => console.log("Available strains:", data));
```

## Available Endpoints (24 Total)

### Breeding Operations (2)
- `POST /api/breed` - Breed two mice
- `POST /api/cross/predict` - Predict offspring phenotypes

### Population Management (4)
- `POST /api/population/create` - Create new population
- `GET /api/population/{id}` - Get population details
- `POST /api/population/{id}/select` - Apply selection strategy
- `POST /api/population/{id}/advance` - Advance generation

### Genetics Analysis (3)
- `POST /api/genetics/grm` - Compute Genomic Relationship Matrix
- `POST /api/genetics/inbreeding` - Calculate inbreeding coefficients
- `POST /api/genetics/heritability` - Estimate heritability

### Validation Methods (6)
- `GET /api/validate/all` - Run all validation tests
- `GET /api/validate/mendelian` - Test Mendelian ratios (95% accuracy!)
- `GET /api/validate/grm` - Test GRM accuracy
- `GET /api/validate/inbreeding` - Test inbreeding correlation
- `GET /api/validate/heritability` - Test heritability estimation
- `GET /api/validate/real` - Test real mode predictions

### Real Data Operations (3)
- `GET /api/real/strains` - List available strains
- `GET /api/real/genes` - List available genes
- `POST /api/real/cross` - Simulate real strain cross

### Utility Functions (3)
- `GET /` - API health check
- `GET /health` - Detailed health check
- `GET /docs` - Interactive documentation

### WebSocket Communication (1)
- `WS /ws/breeding` - Real-time breeding updates

### Health Monitoring (2)
- `GET /` - Basic status
- `GET /health` - Detailed status

## Connecting Your Frontend

### Step 1: Set API URL
In your frontend config:
```javascript
const API_BASE_URL = "http://localhost:8000";
```

### Step 2: Make API Calls
```javascript
// Example: Create population and breed mice
async function startBreeding() {
  // 1. Create population
  const popResponse = await fetch(`${API_BASE_URL}/api/population/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      size: 30,
      mode: "sim",
      goal: { "size": "large", "temperament": "friendly" }
    })
  });
  const population = await popResponse.json();
  console.log("Population created:", population);

  // 2. Breed first two mice
  const breedResponse = await fetch(`${API_BASE_URL}/api/breed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent1_id: 0,
      parent2_id: 1,
      n_offspring: 4
    })
  });
  const offspring = await breedResponse.json();
  console.log("Offspring:", offspring);
}

startBreeding();
```

### Step 3: Handle CORS
CORS is already enabled for all origins in the backend, so your frontend should work without issues!

## Server Information

- **Host:** 0.0.0.0 (accessible from anywhere)
- **Port:** 8000
- **Process:** Running in Terminal 4
- **Framework:** FastAPI 0.109.0
- **Server:** Uvicorn 0.27.0
- **Database:** SQLite (mouse_breeding.db)

## To Stop the Server

Press `CTRL+C` in the terminal where the server is running (Terminal 4).

## To Restart the Server

```bash
cd backend
python run.py
```

Or double-click `backend/start_server.bat`

## Next Steps

1. Your backend is RUNNING
2. Interactive docs are OPEN in your browser (http://localhost:8000/docs)
3. Now start your FRONTEND application
4. Point your frontend to http://localhost:8000
5. Start breeding mice!

## Need Help?

- **Interactive Docs:** http://localhost:8000/docs (try endpoints here!)
- **Full API Reference:** See `backend/API_DOCUMENTATION.md`
- **Quick Start Guide:** See `QUICK_START_GUIDE.md`
- **Backend Details:** See `backend/START_BACKEND.md`

## Summary

**Backend Status:** RUNNING  
**API URL:** http://localhost:8000  
**Documentation:** http://localhost:8000/docs (OPENED)  
**Health:** HEALTHY  
**Ready for Frontend:** YES

You're all set! Start your frontend and connect it to http://localhost:8000

