# Validation Parameters Feature

## Problem

The validation tests had hardcoded parameters:
- Mendelian test: 1000 trials
- GRM test: population size 10
- Inbreeding test: population size 20, 5 generations
- Heritability test: population size 100

Small population sizes can cause tests to fail due to statistical noise, even when the simulation is correct. Users need to be able to adjust these parameters to:
1. Increase accuracy by using larger populations
2. Reduce test time by using smaller populations
3. Understand the trade-off between speed and accuracy

## Solution

Added configurable validation parameters with sensible defaults and UI controls.

### Parameters Added

1. **Number of Trials** (Mendelian Test)
   - Default: 1000
   - Range: 100-10,000
   - Effect: More trials = more accurate chi-square test

2. **Population Size** (GRM, Heritability Tests)
   - Default: 100
   - Range: 10-500
   - Effect: Larger population = more robust statistical estimates

3. **Number of Generations** (Inbreeding Test)
   - Default: 5
   - Range: 3-10
   - Effect: More generations = higher inbreeding accumulation

## Implementation

### Backend Changes

**File: `backend/app/schemas.py`**

Added request schema:
```python
class ValidationRequest(BaseModel):
    n_trials: int = 1000
    population_size: int = 100
    n_generations: int = 5
```

**File: `mouse-breeder.py`**

Updated validation functions to accept parameters:
```python
def validate_mendelian_ratios(n_trials: int = 1000) -> bool:
    # Already had this parameter

def validate_grm_relationships(population_size: int = 10) -> bool:
    # Added parameter (was hardcoded)
    pop = Population(size=population_size, goal=GoalPresets.LARGE_FRIENDLY)

def validate_inbreeding_correlation(population_size: int = 20, n_generations: int = 5) -> bool:
    # Added parameters (were hardcoded)
    pop = Population(size=population_size, goal=GoalPresets.LARGE_FRIENDLY)
    for gen in range(n_generations):
        pop.next_generation(strategy='fitness', cull_rate=0.0)

def validate_heritability(population_size: int = 100) -> bool:
    # Added parameter (was hardcoded)
    pop = Population(size=population_size, goal=GoalPresets.LARGE_FRIENDLY)
```

**File: `backend/app/main.py`**

Updated endpoint to accept and pass parameters:
```python
@app.post("/api/validate/all")
async def run_all_validation(params: ValidationRequest = None, db: Session = Depends(get_db)):
    if params is None:
        params = ValidationRequest()
    
    result1 = validate_mendelian_ratios(n_trials=params.n_trials)
    result2 = validate_grm_relationships(population_size=params.population_size)
    result3 = validate_inbreeding_correlation(
        population_size=params.population_size,
        n_generations=params.n_generations
    )
    result4 = validate_heritability(population_size=params.population_size)
```

### Frontend Changes

**File: `client/src/components/SinglePage.jsx`**

Added state for validation parameters:
```javascript
const [validationParams, setValidationParams] = useState({
  n_trials: 1000,
  population_size: 100,
  n_generations: 5,
});
```

Added input fields in validation panel:
- Number input for trials (100-10,000)
- Number input for population size (10-500)
- Number input for generations (3-10)
- Helper text showing defaults and recommendations

Updated handler to pass parameters:
```javascript
async function handleRunValidation() {
  const res = await api.validateAll(validationParams);
  // Log includes parameters used
  message: `Validation completed: ${res.pass_count}/${res.total_count} tests passed (n_trials=${validationParams.n_trials}, pop_size=${validationParams.population_size})`
}
```

**File: `client/src/api.js`**

Updated API function to accept parameters:
```javascript
export const validateAll = (params = {}) =>
  request("/api/validate/all", { method: "POST", body: JSON.stringify(params) });
```

## User Experience

### Before:
- Tests run with fixed parameters
- Small populations might fail randomly
- No way to adjust accuracy vs speed trade-off
- Users confused why tests sometimes fail

### After:
- Users can adjust parameters before running tests
- Clear guidance on recommended ranges
- Helper text explains trade-offs
- Activity log shows which parameters were used

## Recommendations for Users

### For Quick Testing (Development):
```
n_trials: 500
population_size: 50
n_generations: 3
Time: ~15-20 seconds
```

### For Standard Validation (Default):
```
n_trials: 1000
population_size: 100
n_generations: 5
Time: ~30-60 seconds
```

### For High-Confidence Validation (Presentation):
```
n_trials: 2000
population_size: 200
n_generations: 7
Time: ~2-3 minutes
```

## Files Modified

1. **backend/app/schemas.py** - Added ValidationRequest schema
2. **backend/app/main.py** - Updated endpoint to accept parameters
3. **mouse-breeder.py** - Updated 4 validation functions to accept parameters
4. **client/src/components/SinglePage.jsx** - Added parameter inputs and state
5. **client/src/api.js** - Updated API call to send parameters

## Benefits

1. **Flexibility** - Users control accuracy vs speed trade-off
2. **Transparency** - Clear what parameters affect which tests
3. **Reliability** - Larger populations reduce false failures
4. **Educational** - Users learn about statistical power
5. **Professional** - Demonstrates understanding of validation methodology

