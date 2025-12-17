# Validation Tab Feature

## Problem

The application had comprehensive validation tests in the backend (5 scientific methods) but NO way to access them from the web UI. This was a critical gap for academic presentations where lecturers would ask:

"How do I know your simulation is scientifically accurate?"

**Before:** No answer visible in the UI (only backend API endpoints)  
**After:** Dedicated Validation tab with one-click testing and detailed results

## Solution

Added a third tab "Validation" to the main interface that allows users to:

1. Run all 5 validation tests with one click
2. View pass/fail status for each test
3. See overall validation score
4. Read explanations of each validation method
5. View scientific references

## Implementation

### Backend (Already Existed)

The backend already had 5 validation methods:

1. **Mendelian Ratios (Chi-Square)** - Tests 1:2:1 inheritance ratios
2. **GRM Relationship Accuracy** - Validates genomic relationships
3. **Inbreeding Correlation** - Compares pedigree vs genomic inbreeding
4. **Realized Heritability** - Tests heritability estimation
5. **Real Mode Predictions** - Validates real data accuracy

**Endpoint:** `POST /api/validate/all`

### Frontend Changes

**File: `client/src/api.js`**

Added validation API functions:

```javascript
export const validateAll = () =>
  request("/api/validate/all", { method: "POST" });
export const validateMendelian = () =>
  request("/api/validate/mendelian", { method: "POST" });
export const validateGRM = () =>
  request("/api/validate/grm", { method: "POST" });
export const validateInbreeding = () =>
  request("/api/validate/inbreeding", { method: "POST" });
export const validateHeritability = () =>
  request("/api/validate/heritability", { method: "POST" });
export const validateRealMode = () =>
  request("/api/validate/real-mode", { method: "POST" });
```

**File: `client/src/components/SinglePage.jsx`**

**1. Added validation state:**

```javascript
const [validationResults, setValidationResults] = useState(null);
const [validationLoading, setValidationLoading] = useState(false);
const [validationError, setValidationError] = useState(null);
```

**2. Added validation handler:**

```javascript
async function handleRunValidation() {
  setValidationLoading(true);
  const res = await api.validateAll();
  setValidationResults(res);
  setValidationLoading(false);
}
```

**3. Added third tab button:**

```javascript
<button
  onClick={() => setMode("VALIDATION")}
  className={mode === "VALIDATION" ? "active" : ""}
>
  Validation
</button>
```

**4. Added validation panel in left sidebar:**

- "Run All Validation Tests" button
- Overall pass/fail indicator
- List of 5 tests with pass/fail status
- Descriptions of each method

**5. Added validation details in main area:**

- Detailed explanations of each test
- Scientific references (Mendel 1866, VanRaden 2008, etc.)
- Loading state during test execution
- Comprehensive results display

## User Experience

### Before Validation Tab:

```
Lecturer: "How accurate is your simulation?"
Student: "Uh... we have backend tests... let me show you the code..."
Lecturer: "I want to see it working."
Student: "..."
```

### After Validation Tab:

```
Lecturer: "How accurate is your simulation?"
Student: "Click the Validation tab."
[Clicks "Run All Validation Tests"]
[30 seconds later]
Result: ✓ VALIDATION PASSED - 5 of 5 tests passed (100%)

Lecturer: "Impressive! What tests did you run?"
Student: [Points to detailed results]
- Mendelian Ratios (Chi-Square) - PASS
- GRM Relationship Accuracy - PASS
- Inbreeding Correlation - PASS
- Realized Heritability - PASS
- Real Mode Predictions - PASS

Lecturer: "Excellent work!"
```

## Validation Methods Explained

### 1. Mendelian Ratios (Chi-Square Test)

- **Reference:** Mendel (1866), Pearson (1900)
- **Test:** Aa × Aa cross produces 1:2:1 ratio (25% AA, 50% Aa, 25% aa)
- **Pass Criteria:** Chi-square p-value > 0.05

### 2. GRM Relationship Accuracy

- **Reference:** VanRaden (2008), Wright (1922)
- **Test:** Genomic relationships match expected values
  - Unrelated: 0.0
  - Parent-offspring: 0.5
  - Full siblings: 0.5
- **Pass Criteria:** Mean Absolute Error < 0.10

### 3. Inbreeding Coefficient Correlation

- **Reference:** Pryce et al. (2012)
- **Test:** Pedigree F correlates with genomic F
- **Pass Criteria:** Correlation > 0.85

### 4. Realized Heritability

- **Reference:** Falconer & Mackay (1996)
- **Test:** Heritability estimation from selection response
- **Pass Criteria:** Estimated h² within expected range

### 5. Real Mode Prediction Accuracy

- **Reference:** Mouse Genome Database (MGD)
- **Test:** Predictions match known strain genotypes
- **Pass Criteria:** Accuracy > 90%

## Response Format

```json
{
  "results": {
    "mendelian_ratios": true,
    "grm_relationships": true,
    "inbreeding_correlation": true,
    "heritability": true,
    "real_mode_predictions": true
  },
  "pass_count": 5,
  "total_count": 5,
  "overall_pass": true,
  "detailed_results": [
    {
      "method_name": "Mendelian Ratios (Chi-Square)",
      "passed": true,
      "result_data": { "test": "chi_square" },
      "timestamp": "2025-12-17T10:30:00Z"
    }
  ]
}
```

## Files Modified

1. **client/src/api.js**

   - Added 6 validation API functions

2. **client/src/components/SinglePage.jsx**
   - Added validation state (results, loading, error)
   - Added `handleRunValidation()` function
   - Added third tab button "Validation"
   - Added validation panel in left sidebar
   - Added validation details in main area
   - Conditional rendering based on mode

## Benefits

1. **Academic Credibility** - Demonstrates scientific rigor
2. **Transparency** - Shows exactly how accuracy is verified
3. **Professional** - Lab-grade validation suite
4. **Educational** - Explains each validation method
5. **One-Click** - Easy for lecturers to verify during presentations
6. **Comprehensive** - 5 different validation approaches

## Testing Checklist

- [ ] Click Validation tab
- [ ] Click "Run All Validation Tests"
- [ ] Wait 30-60 seconds for completion
- [ ] See overall PASS/FAIL result
- [ ] See 5 individual test results
- [ ] Each test shows PASS or FAIL
- [ ] Timestamps are displayed
- [ ] Activity log shows validation event
- [ ] Can switch back to Simulation/Real Data tabs
- [ ] Validation results persist when switching tabs

## Quick Start Testing

1. Start the backend server:

   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend dev server:

   ```bash
   cd client
   npm run dev
   ```

3. Open browser to http://localhost:5173

4. Click the "Validation" tab (third button in header)

5. Click "Run All Validation Tests"

6. Wait for results (30-60 seconds)

7. Verify all 5 tests show PASS status

## Syntax Fix Applied

Fixed ternary operator structure in SinglePage.jsx:

- Changed line 456 from `) : (` to `) : mode === "REAL" ? (`
- This properly chains the three modes: SIM, REAL, and VALIDATION
- Structure: `{mode === "SIM" ? (...) : mode === "REAL" ? (...) : mode === "VALIDATION" ? (...) : null}`
