"""
Simple endpoint testing script for Mouse Breeding Simulator API.
Run this while the server is running to test all endpoints.
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_endpoint(name, method, url, data=None, expected_status=200):
    """Test a single endpoint."""
    print(f"\nTesting: {name}")
    print(f"  {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            print(f"  ERROR: Unknown method {method}")
            return False
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print(f"  PASS")
            if response.text:
                result = response.json()
                print(f"  Response: {json.dumps(result, indent=2)[:200]}...")
            return True
        else:
            print(f"  FAIL: Expected {expected_status}, got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"  ERROR: {str(e)}")
        return False

def main():
    print("=" * 80)
    print("MOUSE BREEDING SIMULATOR API - ENDPOINT TESTS")
    print("=" * 80)
    
    # Wait for server to be ready
    print("\nWaiting for server to be ready...")
    for i in range(10):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=2)
            if response.status_code == 200:
                print("Server is ready!")
                break
        except:
            print(f"  Attempt {i+1}/10...")
            time.sleep(1)
    else:
        print("ERROR: Server not responding. Make sure it's running on port 8000.")
        return
    
    results = []
    
    # TEST 1: Health Check
    results.append(test_endpoint(
        "Health Check",
        "GET",
        f"{BASE_URL}/health"
    ))
    
    # TEST 2: API Info
    results.append(test_endpoint(
        "API Info",
        "GET",
        f"{BASE_URL}/"
    ))
    
    # TEST 3: Get Strains
    results.append(test_endpoint(
        "Get Strains",
        "GET",
        f"{BASE_URL}/api/strains"
    ))
    
    # TEST 4: Get Genes
    results.append(test_endpoint(
        "Get Genes",
        "GET",
        f"{BASE_URL}/api/genes"
    ))
    
    # TEST 5: Create Population
    results.append(test_endpoint(
        "Create Population",
        "POST",
        f"{BASE_URL}/api/population/create",
        data={"size": 10, "goal": "large_friendly"}
    ))
    
    # TEST 6: Breed Mice
    results.append(test_endpoint(
        "Breed Mice",
        "POST",
        f"{BASE_URL}/api/breed",
        data={"parent1_id": "0", "parent2_id": "1", "num_offspring": 5}
    ))

    # TEST 7: Predict Cross
    results.append(test_endpoint(
        "Predict Cross",
        "POST",
        f"{BASE_URL}/api/cross/predict",
        data={"parent1_id": "0", "parent2_id": "1"}
    ))

    # TEST 8: Compute GRM
    results.append(test_endpoint(
        "Compute GRM",
        "POST",
        f"{BASE_URL}/api/genetics/grm",
        data={"mouse_ids": ["0", "1", "2", "3", "4"]}
    ))

    # TEST 9: Compute Inbreeding
    results.append(test_endpoint(
        "Compute Inbreeding",
        "POST",
        f"{BASE_URL}/api/genetics/inbreeding",
        data={"mouse_ids": ["0", "1", "2"]}
    ))

    # TEST 10: Estimate Heritability
    results.append(test_endpoint(
        "Estimate Heritability",
        "POST",
        f"{BASE_URL}/api/genetics/heritability",
        data={"population_id": "pop_0", "trait": "weight"}
    ))
    
    # TEST 11: Validate All (this takes time)
    print("\n" + "=" * 80)
    print("Running validation suite (this may take 30-60 seconds)...")
    print("=" * 80)
    results.append(test_endpoint(
        "Validate All Methods",
        "POST",
        f"{BASE_URL}/api/validate/all"
    ))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total} ({100*passed//total}%)")
    
    if passed == total:
        print("\nALL TESTS PASSED!")
    else:
        print(f"\n{total - passed} tests failed.")

if __name__ == "__main__":
    main()

