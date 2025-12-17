# Validation Parameters Data Flow Test

## Purpose
Verify that user-inputted validation parameters are correctly passed from frontend to backend.

## Data Flow Chain

```
User Input (UI)
    ↓
validationParams state (React)
    ↓
handleRunValidation() function
    ↓
api.validateAll(validationParams)
    ↓
HTTP POST /api/validate/all with JSON body
    ↓
FastAPI endpoint: run_all_validation(request: ValidationRequest)
    ↓
Validation functions with parameters
```

## Test Steps

### 1. Start Backend Server
```bash
cd backend
uvicorn app.main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Start Frontend Server
```bash
cd client
npm run dev
```

Expected output:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

### 3. Open Browser Console
- Open http://localhost:5173
- Press F12 to open Developer Tools
- Go to Console tab

### 4. Navigate to Validation Tab
- Click "Validation" tab in the UI
- You should see three input fields with default values:
  - Number of Trials: 1000
  - Population Size: 100
  - Number of Generations: 5

### 5. Test with Default Values
- Click "Run All Validation Tests" button
- Check browser console for log:
  ```
  Running validation with parameters: {n_trials: 1000, population_size: 100, n_generations: 5}
  ```
- Check backend terminal for log:
  ```
  Validation parameters received: n_trials=1000, population_size=100, n_generations=5
  ```

### 6. Test with Custom Values
- Change Number of Trials to: 500
- Change Population Size to: 50
- Change Number of Generations to: 3
- Click "Run All Validation Tests" button
- Check browser console for log:
  ```
  Running validation with parameters: {n_trials: 500, population_size: 50, n_generations: 3}
  ```
- Check backend terminal for log:
  ```
  Validation parameters received: n_trials=500, population_size=50, n_generations=3
  ```

### 7. Test with Large Values
- Change Number of Trials to: 2000
- Change Population Size to: 200
- Change Number of Generations to: 7
- Click "Run All Validation Tests" button
- Check browser console for log:
  ```
  Running validation with parameters: {n_trials: 2000, population_size: 200, n_generations: 7}
  ```
- Check backend terminal for log:
  ```
  Validation parameters received: n_trials=2000, population_size=200, n_generations=7
  ```
- Note: This test will take longer (2-3 minutes)

## Expected Results

### Frontend Console
Should show:
```
Running validation with parameters: {n_trials: X, population_size: Y, n_generations: Z}
```
Where X, Y, Z match the values you entered in the input fields.

### Backend Terminal
Should show:
```
Validation parameters received: n_trials=X, population_size=Y, n_generations=Z
```
Where X, Y, Z match the values from the frontend.

### Activity Log
Should show:
```
Validation completed: 5/5 tests passed (n_trials=X, pop_size=Y)
```

### Validation Results Panel
Should display detailed results for all 5 tests.

## Verification Checklist

- [ ] Frontend console logs show correct parameters
- [ ] Backend terminal logs show correct parameters
- [ ] Parameters in frontend match parameters in backend
- [ ] Activity log shows parameters used
- [ ] Tests run with specified parameters (verify by timing - larger = slower)
- [ ] Changing parameters and re-running uses new values
- [ ] Default values (1000, 100, 5) work correctly
- [ ] Small values (500, 50, 3) work correctly
- [ ] Large values (2000, 200, 7) work correctly

## Common Issues

### Issue: Backend shows default values instead of custom values
**Cause:** Request body not being sent correctly
**Fix:** Check that `api.validateAll()` includes `body: JSON.stringify(params)`

### Issue: Frontend console shows correct values but backend shows different values
**Cause:** FastAPI not parsing request body correctly
**Fix:** Ensure endpoint signature is `request: ValidationRequest` (not `params: ValidationRequest = None`)

### Issue: Tests always run with same speed regardless of parameters
**Cause:** Parameters not being passed to validation functions
**Fix:** Check that validation functions are called with `request.n_trials`, `request.population_size`, etc.

## Success Criteria

✅ All three parameters are correctly passed from UI to backend
✅ Backend logs match frontend logs
✅ Tests run with specified parameters (verifiable by execution time)
✅ Activity log shows parameters used
✅ Changing parameters and re-running uses new values

## Files Involved

1. **client/src/components/SinglePage.jsx** - UI inputs and state
2. **client/src/api.js** - API call with JSON body
3. **backend/app/main.py** - Endpoint receiving parameters
4. **backend/app/schemas.py** - ValidationRequest schema
5. **mouse-breeder.py** - Validation functions using parameters

