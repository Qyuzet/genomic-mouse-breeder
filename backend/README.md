# MOUSE BREEDING SIMULATOR - BACKEND API

FastAPI-based REST API for genomic mouse breeding simulation with real SNP data from the Mouse Phenome Database.

## QUICK START

### Prerequisites

- Python 3.8 or higher
- pip package manager
- 100MB disk space

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start server
python run.py
```

### Access Points

- API Base: http://localhost:8000
- Interactive Documentation: http://localhost:8000/docs
- Alternative Documentation: http://localhost:8000/redoc

## PROJECT STRUCTURE

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── database.py             # SQLite database models
│   ├── schemas.py              # Pydantic request/response models
│   ├── core/                   # Core genetics modules
│   └── services/
│       └── genetics_service.py # Business logic layer
├── datasets/                   # Mouse Phenome Database data
├── gene_models.json            # Gene configuration
├── requirements.txt            # Python dependencies
├── run.py                      # Startup script
├── API_DOCUMENTATION.md        # Complete API documentation
└── README.md                   # This file
```

## FEATURES

### Breeding Operations

- Breed two mice with Mendelian inheritance
- Predict cross outcomes using real SNP data
- Recombination via Poisson crossovers
- Per-locus mutation modeling

### Population Management

- Create populations with custom parameters
- Select top mice for breeding
- Advance generations with selection strategies
- Track population statistics

### Genetics Analysis

- Compute Genomic Relationship Matrix (GRM)
- Calculate inbreeding coefficients
- Estimate realized heritability
- Quantitative trait analysis via LMM

### Validation Suite

- Chi-square test for Mendelian ratios
- GRM relationship accuracy
- Inbreeding coefficient correlation
- Realized heritability estimation
- Real mode prediction accuracy

### Real Data Integration

- Mouse Phenome Database (MPD) integration
- Multiple inbred strains (C57BL/6J, DBA/2J, etc.)
- Multiple genes (TYRP1, MC1R, TYR, etc.)
- Real SNP-based crosses

### WebSocket Support

- Real-time breeding simulations
- Live generation advancement
- Progress updates for long operations

## API ENDPOINTS

### Core Endpoints

| Method | Endpoint                     | Description            |
| ------ | ---------------------------- | ---------------------- |
| GET    | /                            | Health check           |
| GET    | /health                      | Detailed health status |
| POST   | /api/breed                   | Breed two mice         |
| POST   | /api/cross/predict           | Predict cross outcomes |
| POST   | /api/population/create       | Create population      |
| GET    | /api/population/{id}         | Get population details |
| POST   | /api/population/{id}/select  | Select mice            |
| POST   | /api/population/{id}/advance | Advance generation     |
| POST   | /api/genetics/grm            | Compute GRM            |
| POST   | /api/genetics/inbreeding     | Calculate inbreeding   |
| POST   | /api/genetics/heritability   | Estimate heritability  |
| POST   | /api/validate/all            | Run all validations    |
| GET    | /api/strains                 | List available strains |
| GET    | /api/genes                   | List available genes   |
| POST   | /api/real/cross              | Real data cross        |
| GET    | /api/mouse/{id}              | Get mouse details      |
| WS     | /ws/breeding                 | WebSocket endpoint     |

See `API_DOCUMENTATION.md` for complete endpoint documentation.

## CONFIGURATION

### Environment Variables

```bash
API_HOST=0.0.0.0        # Server host
API_PORT=8000           # Server port
API_RELOAD=true         # Auto-reload on code changes
```

### Database

SQLite database is automatically created at `mouse_breeding.db`.

## USAGE EXAMPLES

### Python

```python
import requests

# Create population
response = requests.post(
    "http://localhost:8000/api/population/create",
    json={"size": 50, "goal_preset": "LARGE_FRIENDLY"}
)
pop_id = response.json()["id"]

# Breed mice
response = requests.post(
    "http://localhost:8000/api/breed",
    json={"parent1_id": "0", "parent2_id": "1", "n_offspring": 2}
)
offspring = response.json()["offspring"]
```

### JavaScript

```javascript
// Create population
const response = await fetch("http://localhost:8000/api/population/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ size: 50, goal_preset: "LARGE_FRIENDLY" }),
});
const data = await response.json();

// WebSocket connection
const ws = new WebSocket("ws://localhost:8000/ws/breeding");
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

### cURL

```bash
# Run validation
curl -X POST http://localhost:8000/api/validate/all

# Get strains
curl http://localhost:8000/api/strains

# Compute GRM
curl -X POST http://localhost:8000/api/genetics/grm \
  -H "Content-Type: application/json" \
  -d '{"mouse_ids": ["0", "1", "2"]}'
```

## TESTING

Run automated test suite:

```bash
python test_api.py
```

Access interactive documentation for manual testing:

```
http://localhost:8000/docs
```

## DEPLOYMENT

Refer to `DEPLOYMENT_GUIDE.md` for production deployment instructions including Docker, Systemd, Nginx, and cloud platform options.

## DOCUMENTATION

- `API_DOCUMENTATION.md` - Complete API reference (917 lines)
- `DEPLOYMENT_GUIDE.md` - Production deployment guide
- `README.md` - This quick start guide

## SCIENTIFIC REFERENCES

1. VanRaden, P.M. (2008). Efficient methods to compute genomic predictions. Journal of Dairy Science, 91(11), 4414-4423.

2. Falconer, D.S. & Mackay, T.F.C. (1996). Introduction to Quantitative Genetics (4th ed.). Longman, Harlow, UK.

3. Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine Series 5, 50(302), 157-175.

4. Bult, C.J., Blake, J.A., Smith, C.L., Kadin, J.A., Richardson, J.E., & the Mouse Genome Database Group (2019). Mouse Genome Database (MGD) 2019. Nucleic Acids Research, 47(D1), D801-D806.

## LICENSE

Educational and academic use only.
