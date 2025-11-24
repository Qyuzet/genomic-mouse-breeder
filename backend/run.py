"""
Startup script for Mouse Breeding Simulator API.
Run this from the backend directory: python run.py
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add current directory to Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)

    # Get configuration from environment or use defaults
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "false").lower() == "true"  # Disable reload by default

    print("=" * 80)
    print("MOUSE BREEDING SIMULATOR API")
    print("=" * 80)
    print(f"Starting server on http://{host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Alternative Docs: http://{host}:{port}/redoc")
    print("=" * 80)

    # Change to backend directory
    os.chdir(current_dir)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

