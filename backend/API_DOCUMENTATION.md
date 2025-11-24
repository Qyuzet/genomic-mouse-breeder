# MOUSE BREEDING SIMULATOR - API DOCUMENTATION

## OVERVIEW

RESTful API for genomic mouse breeding simulation with real SNP data from the Mouse Phenome Database.

**Base URL:** `http://localhost:8000`

**Interactive Documentation:** `http://localhost:8000/docs`

**Alternative Documentation:** `http://localhost:8000/redoc`

---

## TECHNOLOGY STACK

- **Framework:** FastAPI 0.104.1
- **Server:** Uvicorn (ASGI)
- **Database:** SQLite (local)
- **WebSocket:** Real-time breeding simulations
- **Validation:** Pydantic models
- **CORS:** Enabled for frontend access

---

## AUTHENTICATION

Currently, no authentication is required. All endpoints are publicly accessible.

---

## API ENDPOINTS

### HEALTH CHECK

#### GET /

Health check endpoint.

**Response:**

```json
{
  "status": "online",
  "service": "Mouse Breeding Simulator API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

#### GET /health

Detailed health check with statistics.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "populations": 5,
  "mice": 250
}
```

---

### BREEDING OPERATIONS

#### POST /api/breed

Breed two mice and return offspring.

**Request Body:**

```json
{
  "parent1_id": "0",
  "parent2_id": "1",
  "n_offspring": 2
}
```

**Response:**

```json
{
  "offspring": [
    {
      "id": "10",
      "generation": 1,
      "sex": "large",
      "phenotype": 105.5,
      "genome_summary": {
        "coat_color": "black",
        "size": "large",
        "ear_shape": "normal",
        "temperament": "friendly"
      },
      "pedigree": {
        "parents": [0, 1],
        "generation": 1
      }
    }
  ],
  "cross_diagram": "black x black",
  "genotype_counts": {
    "black": 2
  },
  "phenotype_summary": {
    "total_offspring": 2
  }
}
```

**Features:**

- Mendelian inheritance with recombination
- Poisson crossovers on 2 chromosomes
- Per-locus mutation
- Quantitative trait via Linear Mixed Model

---

#### POST /api/cross/predict

Predict cross outcomes using real SNP data.

**Request Body:**

```json
{
  "strain1": "C57BL/6J",
  "strain2": "DBA/2J",
  "gene": "TYRP1"
}
```

**Response:**

```json
{
  "strain1": "C57BL/6J",
  "strain2": "DBA/2J",
  "gene": "TYRP1",
  "genotypes": {
    "AA": 0.25,
    "Aa": 0.5,
    "aa": 0.25
  },
  "phenotypes": {
    "black": 0.75,
    "brown": 0.25
  },
  "punnett_square": "A a\nA AA Aa\na Aa aa",
  "expected_ratios": {
    "3:1": "dominant model"
  }
}
```

---

### POPULATION MANAGEMENT

#### POST /api/population/create

Create a new population.

**Request Body:**

```json
{
  "size": 100,
  "goal_preset": "LARGE_FRIENDLY",
  "name": "Experiment 1"
}
```

**Response:**

```json
{
  "id": "pop_0",
  "name": "Experiment 1",
  "size": 100,
  "goal_preset": "LARGE_FRIENDLY",
  "generation": 0,
  "created_at": "2024-01-01T00:00:00",
  "mice_sample": [...]
}
```

**Goal Presets:**

- `LARGE_FRIENDLY` - Large, friendly mice
- `SMALL_AGGRESSIVE` - Small, aggressive mice
- `DUMBO_EARS` - Dumbo ear phenotype
- `WHITE_COAT` - White coat color

---

#### GET /api/population/{pop_id}

Get population details.

**Parameters:**

- `pop_id` (path) - Population ID

**Response:**

```json
{
  "id": "pop_0",
  "size": 100,
  "generation": 5,
  "mice_sample": [...]
}
```

---

#### POST /api/population/{pop_id}/select

Select top mice for breeding.

**Request Body:**

```json
{
  "top_percent": 0.2,
  "method": "phenotype"
}
```

**Response:**

```json
{
  "selected_count": 20,
  "selected_mice": [...],
  "mean_phenotype": 110.5,
  "selection_differential": 8.3
}
```

---

#### POST /api/population/{pop_id}/advance

Advance to next generation.

**Response:**

```json
{
  "generation": 6,
  "population_size": 100,
  "statistics": {
    "mean_fitness": 85.5,
    "mean_phenotype": 108.2
  }
}
```

---

### GENETICS ANALYSIS

#### POST /api/genetics/grm

Compute Genomic Relationship Matrix.

**Request Body:**

```json
{
  "mouse_ids": ["0", "1", "2", "3"]
}
```

**Response:**

```json
{
  "grm": [
    [1.0, 0.0, 0.5, 0.25],
    [0.0, 1.0, 0.5, 0.25],
    [0.5, 0.5, 1.0, 0.5],
    [0.25, 0.25, 0.5, 1.0]
  ],
  "mouse_ids": ["0", "1", "2", "3"],
  "size": 4
}
```

**Formula:** G = (M - 2P)(M - 2P)^T / sum(2p(1-p))

**Reference:** VanRaden (2008) J. Dairy Sci. 91:4414-4423

---

#### POST /api/genetics/inbreeding

Calculate inbreeding coefficients.

**Request Body:**

```json
{
  "mouse_ids": ["10", "11", "12"]
}
```

**Response:**

```json
{
  "results": [
    {
      "mouse_id": "10",
      "f_pedigree": 0.25,
      "f_genomic": 0.23
    },
    {
      "mouse_id": "11",
      "f_pedigree": 0.125,
      "f_genomic": 0.11
    }
  ],
  "mean_f_pedigree": 0.1875,
  "mean_f_genomic": 0.17
}
```

**Methods:**

- F_pedigree: Wright's coefficient from pedigree
- F_genomic: From GRM diagonal (G_ii - 1)

---

#### POST /api/genetics/heritability

Estimate realized heritability.

**Request Body:**

```json
{
  "population_id": "pop_0",
  "trait": "phenotype"
}
```

**Response:**

```json
{
  "h2_realized": 0.42,
  "selection_differential": 5.0,
  "response": 2.1,
  "variance_components": {
    "genetic": 42.0,
    "environmental": 58.0
  }
}
```

**Formula:** h^2 = R / S (Breeder's equation)

**Reference:** Falconer & Mackay (1996) Introduction to Quantitative Genetics

---

### VALIDATION ENDPOINTS

#### POST /api/validate/all

Run all 5 validation methods.

**Response:**

```json
{
  "results": {
    "mendelian_ratios": true,
    "grm_relationships": false,
    "inbreeding_correlation": false,
    "heritability": true,
    "real_mode_predictions": true
  },
  "pass_count": 3,
  "total_count": 5,
  "overall_pass": true,
  "detailed_results": [...]
}
```

**Validation Methods:**

1. Chi-square test for Mendelian ratios (Pearson 1900)
2. GRM relationship accuracy (VanRaden 2008)
3. Inbreeding coefficient correlation (Pryce et al. 2014)
4. Realized heritability estimation (Falconer & Mackay 1996)
5. Real mode prediction accuracy (MGI database)

---

#### POST /api/validate/mendelian

Run Method 1: Chi-square test.

**Response:**

```json
{
  "method": "mendelian_ratios",
  "passed": true
}
```

---

#### POST /api/validate/grm

Run Method 2: GRM validation.

**Response:**

```json
{
  "method": "grm_relationships",
  "passed": false
}
```

---

#### POST /api/validate/inbreeding

Run Method 3: Inbreeding correlation.

**Response:**

```json
{
  "method": "inbreeding_correlation",
  "passed": false
}
```

---

#### POST /api/validate/heritability

Run Method 4: Heritability estimation.

**Response:**

```json
{
  "method": "heritability",
  "passed": true
}
```

---

#### POST /api/validate/real-mode

Run Method 5: Real mode predictions.

**Response:**

```json
{
  "method": "real_mode_predictions",
  "passed": true
}
```

---

### REAL DATA ENDPOINTS

#### GET /api/strains

List available mouse strains.

**Response:**

```json
{
  "strains": ["C57BL/6J", "DBA/2J", "BALB/cJ", "129S1/SvImJ"],
  "count": 4
}
```

**Data Source:** Mouse Phenome Database (MPD)

---

#### GET /api/genes

List available genes with models.

**Response:**

```json
{
  "genes": ["TYRP1", "MC1R", "TYR", "ASIP", "KIT"],
  "count": 5,
  "details": {
    "TYRP1": {
      "name": "Tyrosinase related protein 1",
      "trait": "coat_color",
      "model": {
        "type": "recessive",
        "genotypes": {
          "0": { "phenotype": "black" },
          "1": { "phenotype": "black" },
          "2": { "phenotype": "brown" }
        }
      }
    }
  }
}
```

---

#### POST /api/real/cross

Perform cross using real SNP data.

**Request Body:**

```json
{
  "strain1": "C57BL/6J",
  "strain2": "DBA/2J",
  "gene": "TYRP1"
}
```

**Response:**

```json
{
  "strain1": "C57BL/6J",
  "strain2": "DBA/2J",
  "gene": "TYRP1",
  "genotypes": {
    "strain1": 0,
    "strain2": 2
  },
  "phenotypes": {
    "strain1": "black",
    "strain2": "brown"
  },
  "dataset_info": {
    "source": "Mouse Phenome Database",
    "snps_analyzed": 100,
    "chromosome": "chr4"
  }
}
```

---

### UTILITY ENDPOINTS

#### GET /api/mouse/{mouse_id}

Get mouse details.

**Parameters:**

- `mouse_id` (path) - Mouse ID

**Response:**

```json
{
  "id": "10",
  "generation": 2,
  "sex": "large",
  "phenotype": 108.5,
  "genome_summary": {
    "coat_color": "black",
    "size": "large",
    "ear_shape": "normal",
    "temperament": "friendly"
  },
  "pedigree": {
    "parents": [5, 6],
    "generation": 2
  }
}
```

---

#### GET /api/mouse/{mouse_id}/pedigree

Get pedigree tree.

**Response:**

```json
{
  "mouse_id": "10",
  "generation": 2,
  "parents": [5, 6],
  "pedigree_tree": "Pedigree visualization would go here"
}
```

---

#### POST /api/export/population/{pop_id}

Export population data.

**Parameters:**

- `pop_id` (path) - Population ID
- `format` (query) - Export format: "json" or "csv"

**Response (JSON format):**

```json
{
  "population_id": "pop_0",
  "size": 100,
  "generation": 5,
  "mice": [...]
}
```

---

### WEBSOCKET ENDPOINT

#### WS /ws/breeding

Real-time breeding simulations.

**Connection:** `ws://localhost:8000/ws/breeding`

**Client Message Format:**

```json
{
  "type": "breed",
  "data": {
    "parent1_id": "0",
    "parent2_id": "1",
    "n_offspring": 2
  }
}
```

**Server Response Format:**

```json
{
  "type": "breed_result",
  "status": "success",
  "data": {
    "offspring": [...],
    "count": 2
  },
  "message": null
}
```

**Supported Message Types:**

- `breed` - Breed two mice
- `advance_generation` - Advance population generation

**Example (JavaScript):**

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/breeding");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "breed",
      data: {
        parent1_id: "0",
        parent2_id: "1",
        n_offspring: 2,
      },
    })
  );
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log(response);
};
```

---

## ERROR HANDLING

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Response Format:**

```json
{
  "detail": "Error message here"
}
```

---

## RATE LIMITING

Currently, no rate limiting is implemented. In production, consider adding rate limiting middleware.

---

## CORS CONFIGURATION

CORS is enabled for all origins (`*`). In production, specify exact frontend origins:

```python
allow_origins=["http://localhost:3000", "https://yourdomain.com"]
```

---

## DATABASE

**Type:** SQLite (local file: `mouse_breeding.db`)

**Tables:**

- `populations` - Population records
- `mice` - Individual mouse records
- `breeding_records` - Breeding history
- `validation_results` - Validation test results

**Location:** `backend/mouse_breeding.db`

---

## DEPLOYMENT

### LOCAL DEVELOPMENT

1. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Run server:

```bash
python run.py
```

3. Access API:

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### PRODUCTION DEPLOYMENT

**Option 1: Docker**

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run.py"]
```

**Option 2: Systemd Service**

```ini
[Unit]
Description=Mouse Breeding API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mouse-breeding/backend
ExecStart=/usr/bin/python3 run.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Option 3: Nginx Reverse Proxy**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## TESTING

### Manual Testing

Use the interactive documentation at `/docs` to test all endpoints.

### Automated Testing

```bash
pytest tests/
```

### Example cURL Commands

**Create Population:**

```bash
curl -X POST "http://localhost:8000/api/population/create" \
  -H "Content-Type: application/json" \
  -d '{"size": 50, "goal_preset": "LARGE_FRIENDLY"}'
```

**Breed Mice:**

```bash
curl -X POST "http://localhost:8000/api/breed" \
  -H "Content-Type: application/json" \
  -d '{"parent1_id": "0", "parent2_id": "1", "n_offspring": 2}'
```

**Run Validation:**

```bash
curl -X POST "http://localhost:8000/api/validate/all"
```

---

## PERFORMANCE CONSIDERATIONS

- **Population Size:** Recommended max 1000 mice per population
- **GRM Computation:** O(n^2) complexity, slow for n > 500
- **Validation:** Takes 30-60 seconds for all 5 methods
- **WebSocket:** Supports multiple concurrent connections

---

## FUTURE ENHANCEMENTS

1. User authentication (JWT tokens)
2. Database migration to PostgreSQL
3. Caching layer (Redis)
4. Background task queue (Celery)
5. Rate limiting
6. API versioning
7. GraphQL endpoint
8. Real-time progress updates for long operations

---

## TECHNICAL SUPPORT

For technical issues or questions:

1. Review interactive documentation at http://localhost:8000/docs
2. Consult DEPLOYMENT_GUIDE.md for deployment issues
3. Check GitHub repository for known issues
4. Refer to scientific references for algorithm details

---

## LICENSE

This API is part of the Mouse Breeding Simulator project for educational and academic purposes only.

---

## REFERENCES

1. VanRaden, P.M. (2008). Efficient methods to compute genomic predictions. Journal of Dairy Science, 91(11), 4414-4423.

2. Falconer, D.S. & Mackay, T.F.C. (1996). Introduction to Quantitative Genetics (4th ed.). Longman, Harlow, UK.

3. Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine Series 5, 50(302), 157-175.

4. Pryce, J.E., Haile-Mariam, M., Goddard, M.E., & Hayes, B.J. (2014). Identification of genomic regions associated with inbreeding depression in Holstein and Jersey dairy cattle. Genetics Selection Evolution, 46, 71.

5. Bult, C.J., Blake, J.A., Smith, C.L., Kadin, J.A., Richardson, J.E., & the Mouse Genome Database Group (2019). Mouse Genome Database (MGD) 2019. Nucleic Acids Research, 47(D1), D801-D806.
