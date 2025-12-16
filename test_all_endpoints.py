import requests
import json

BASE_URL = 'http://localhost:8000'

def test_endpoint(name, method, url, payload=None):
    print(f'\n{name}')
    print('-' * 60)
    try:
        if method == 'GET':
            r = requests.get(url)
        elif method == 'POST':
            r = requests.post(url, json=payload)
        
        print(f'Status: {r.status_code}', end='')
        
        if r.status_code == 200:
            print(' - SUCCESS')
            try:
                data = r.json()
                if isinstance(data, dict):
                    for key, value in list(data.items())[:5]:
                        if isinstance(value, (str, int, float, bool)):
                            print(f'  {key}: {value}')
                        elif isinstance(value, list) and len(value) > 0:
                            print(f'  {key}: [{len(value)} items]')
                        elif isinstance(value, dict):
                            print(f'  {key}: {{...}}')
                return True
            except:
                print(f'  Response: {r.text[:100]}')
                return True
        else:
            print(' - FAILED')
            print(f'  Error: {r.text[:200]}')
            return False
    except Exception as e:
        print(f' - ERROR')
        print(f'  Exception: {str(e)[:200]}')
        return False

print('=' * 80)
print('TESTING ALL BACKEND ENDPOINTS')
print('=' * 80)

results = {}

# Health Checks
results['health_root'] = test_endpoint(
    '1. GET / (Health Check)',
    'GET',
    f'{BASE_URL}/'
)

results['health_detailed'] = test_endpoint(
    '2. GET /health',
    'GET',
    f'{BASE_URL}/health'
)

# Real Data
results['strains'] = test_endpoint(
    '3. GET /api/strains',
    'GET',
    f'{BASE_URL}/api/strains'
)

results['genes'] = test_endpoint(
    '4. GET /api/genes',
    'GET',
    f'{BASE_URL}/api/genes'
)

# Population Management
print('\n5. POST /api/population/create')
print('-' * 60)
try:
    payload = {'size': 30, 'mode': 'sim', 'goal': {'size': 'large', 'temperament': 'friendly'}}
    r = requests.post(f'{BASE_URL}/api/population/create', json=payload)
    print(f'Status: {r.status_code}', end='')

    if r.status_code == 200:
        print(' - SUCCESS')
        pop_data = r.json()
        pop_id = pop_data.get('id')
        print(f'  id: {pop_id}')
        print(f'  size: {pop_data.get("size")}')
        print(f'  generation: {pop_data.get("generation")}')
        results['create_population'] = True

        # Now test breeding with this population
        print('\n6. POST /api/breed')
        print('-' * 60)
        try:
            # Get population to find mouse IDs
            pop_response = requests.get(f'{BASE_URL}/api/population/{pop_id}')
            if pop_response.status_code == 200:
                pop_full = pop_response.json()
                mice = pop_full.get('mice_sample', [])  # API returns 'mice_sample', not 'mice'
                if len(mice) >= 2:
                    parent1_id = mice[0]['id']
                    parent2_id = mice[1]['id']
                    results['breed'] = test_endpoint(
                        '6. POST /api/breed (with real IDs)',
                        'POST',
                        f'{BASE_URL}/api/breed',
                        {'parent1_id': parent1_id, 'parent2_id': parent2_id, 'n_offspring': 4}
                    )
                else:
                    print('Status: SKIPPED - Not enough mice in population')
                    results['breed'] = False
            else:
                print('Status: SKIPPED - Could not get population')
                results['breed'] = False
        except Exception as e:
            print(f'Status: ERROR - {str(e)[:100]}')
            results['breed'] = False
    else:
        print(' - FAILED')
        print(f'  Error: {r.text[:200]}')
        results['create_population'] = False
        results['breed'] = False
except Exception as e:
    print(f' - ERROR')
    print(f'  Exception: {str(e)[:200]}')
    results['create_population'] = False
    results['breed'] = False

# Validation
results['validate_mendelian'] = test_endpoint(
    '7. POST /api/validate/mendelian',
    'POST',
    f'{BASE_URL}/api/validate/mendelian'
)

results['validate_grm'] = test_endpoint(
    '8. POST /api/validate/grm',
    'POST',
    f'{BASE_URL}/api/validate/grm'
)

results['validate_inbreeding'] = test_endpoint(
    '9. POST /api/validate/inbreeding',
    'POST',
    f'{BASE_URL}/api/validate/inbreeding'
)

results['validate_heritability'] = test_endpoint(
    '10. POST /api/validate/heritability',
    'POST',
    f'{BASE_URL}/api/validate/heritability'
)

results['validate_real'] = test_endpoint(
    '11. POST /api/validate/real-mode',
    'POST',
    f'{BASE_URL}/api/validate/real-mode'
)

results['validate_all'] = test_endpoint(
    '12. POST /api/validate/all',
    'POST',
    f'{BASE_URL}/api/validate/all'
)

# Real Cross
results['real_cross'] = test_endpoint(
    '13. POST /api/real/cross',
    'POST',
    f'{BASE_URL}/api/real/cross',
    {'strain1': 'C57BL/6J', 'strain2': 'DBA/2J', 'gene': 'MC1R'}
)

# Cross Predict
results['cross_predict'] = test_endpoint(
    '14. POST /api/cross/predict',
    'POST',
    f'{BASE_URL}/api/cross/predict',
    {'strain1': 'C57BL/6J', 'strain2': 'DBA/2J', 'gene': 'MC1R'}
)

# Summary
print('\n' + '=' * 80)
print('SUMMARY')
print('=' * 80)

passed = sum(1 for v in results.values() if v)
total = len(results)
failed = total - passed

print(f'\nTotal Tests: {total}')
print(f'Passed: {passed} ({passed*100//total}%)')
print(f'Failed: {failed} ({failed*100//total}%)')

if failed > 0:
    print('\nFailed Tests:')
    for name, result in results.items():
        if not result:
            print(f'  - {name}')

print('\n' + '=' * 80)

