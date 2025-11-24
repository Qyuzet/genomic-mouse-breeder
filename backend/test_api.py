"""
Simple test script to verify API functionality.
Run this after starting the server with: python run.py
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint."""
    print("\n1. Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    assert response.status_code == 200
    print("   PASS")


def test_create_population():
    """Test population creation."""
    print("\n2. Testing population creation...")
    data = {
        "size": 10,
        "goal_preset": "LARGE_FRIENDLY",
        "name": "Test Population"
    }
    response = requests.post(f"{BASE_URL}/api/population/create", json=data)
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   Population ID: {result['id']}")
    print(f"   Size: {result['size']}")
    assert response.status_code == 200
    print("   PASS")
    return result['id']


def test_breed(pop_id):
    """Test breeding endpoint."""
    print("\n3. Testing breeding...")
    data = {
        "parent1_id": "0",
        "parent2_id": "1",
        "n_offspring": 2
    }
    response = requests.post(f"{BASE_URL}/api/breed", json=data)
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   Offspring count: {len(result['offspring'])}")
    assert response.status_code == 200
    print("   PASS")


def test_grm():
    """Test GRM computation."""
    print("\n4. Testing GRM computation...")
    data = {
        "mouse_ids": ["0", "1", "2", "3"]
    }
    response = requests.post(f"{BASE_URL}/api/genetics/grm", json=data)
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   GRM size: {result['size']}x{result['size']}")
    assert response.status_code == 200
    print("   PASS")


def test_strains():
    """Test strain listing."""
    print("\n5. Testing strain listing...")
    response = requests.get(f"{BASE_URL}/api/strains")
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   Strains: {result['strains']}")
    assert response.status_code == 200
    print("   PASS")


def test_genes():
    """Test gene listing."""
    print("\n6. Testing gene listing...")
    response = requests.get(f"{BASE_URL}/api/genes")
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   Genes: {result['genes']}")
    assert response.status_code == 200
    print("   PASS")


def test_validation():
    """Test validation endpoint."""
    print("\n7. Testing validation (this may take 30-60 seconds)...")
    response = requests.post(f"{BASE_URL}/api/validate/all")
    print(f"   Status: {response.status_code}")
    result = response.json()
    print(f"   Pass count: {result['pass_count']}/{result['total_count']}")
    print(f"   Results: {result['results']}")
    assert response.status_code == 200
    print("   PASS")


def main():
    """Run all tests."""
    print("=" * 80)
    print("MOUSE BREEDING SIMULATOR API - TEST SUITE")
    print("=" * 80)
    print(f"\nTesting API at: {BASE_URL}")
    print("Make sure the server is running (python run.py)")
    
    try:
        # Run tests
        test_health()
        pop_id = test_create_population()
        test_breed(pop_id)
        test_grm()
        test_strains()
        test_genes()
        test_validation()
        
        print("\n" + "=" * 80)
        print("ALL TESTS PASSED")
        print("=" * 80)
        
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to API server.")
        print("Make sure the server is running: python run.py")
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
    except Exception as e:
        print(f"\nERROR: {e}")


if __name__ == "__main__":
    main()

