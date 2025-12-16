# HOW TO START THE BACKEND SERVER

## Quick Start (Recommended)

Open a NEW terminal (not the IDE terminal) and run:

```bash
cd backend
python run.py
```

The server will start on **http://localhost:8000**

## Access Points

Once running, you can access:

- **API Base:** http://localhost:8000
- **Interactive Docs (Swagger):** http://localhost:8000/docs
- **Alternative Docs (ReDoc):** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## What You Should See

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

## Testing the API

### Method 1: Open in Browser
Visit: http://localhost:8000/docs

You'll see an interactive API documentation where you can test all endpoints!

### Method 2: Quick Test with curl
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-16T...",
  "populations": 0,
  "mice": 0
}
```

## Connecting Your Frontend

In your frontend code, set the API base URL to:
```javascript
const API_BASE_URL = "http://localhost:8000";
```

## Available Endpoints

### Breeding Operations
- `POST /api/breed` - Breed two mice
- `POST /api/cross/predict` - Predict offspring phenotypes

### Population Management
- `POST /api/population/create` - Create new population
- `GET /api/population/{id}` - Get population details
- `POST /api/population/{id}/select` - Apply selection strategy
- `POST /api/population/{id}/advance` - Advance generation

### Genetics Analysis
- `POST /api/genetics/grm` - Compute Genomic Relationship Matrix
- `POST /api/genetics/inbreeding` - Calculate inbreeding coefficients
- `POST /api/genetics/heritability` - Estimate heritability

### Validation
- `GET /api/validate/all` - Run all validation tests
- `GET /api/validate/mendelian` - Test Mendelian ratios
- `GET /api/validate/grm` - Test GRM accuracy
- `GET /api/validate/inbreeding` - Test inbreeding correlation
- `GET /api/validate/heritability` - Test heritability estimation
- `GET /api/validate/real` - Test real mode predictions

### Real Data Operations
- `GET /api/real/strains` - List available strains
- `GET /api/real/genes` - List available genes
- `POST /api/real/cross` - Simulate real strain cross

### WebSocket
- `WS /ws/breeding` - Real-time breeding updates

## Troubleshooting

### Port Already in Use
If you see "Address already in use", kill the existing process or use a different port:
```bash
set API_PORT=8001
python run.py
```

### Module Not Found
Make sure you're in the `backend` directory:
```bash
cd backend
python run.py
```

### Dependencies Missing
Install dependencies:
```bash
pip install -r requirements.txt
```

## Stopping the Server

Press `CTRL+C` in the terminal where the server is running.

## Environment Variables (Optional)

You can customize the server with environment variables:

```bash
# Windows PowerShell
$env:API_HOST="127.0.0.1"
$env:API_PORT="8000"
$env:API_RELOAD="true"
python run.py

# Linux/Mac
export API_HOST="127.0.0.1"
export API_PORT="8000"
export API_RELOAD="true"
python run.py
```

## Next Steps

1. Start the backend server (this guide)
2. Open http://localhost:8000/docs to explore the API
3. Start your frontend application
4. Connect frontend to http://localhost:8000
5. Start breeding mice!

