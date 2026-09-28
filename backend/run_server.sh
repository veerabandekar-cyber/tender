#!/usr/bin/env bash
# Run the public catalogue API server locally

echo "🚀 Starting ASTTC Public Product Catalogue API..."

# Cross-platform virtual environment activation (Mac/Linux vs Windows)
if [ -d "venv" ]; then
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || -f "venv/Scripts/activate" ]]; then
        # Windows (Git Bash)
        source venv/Scripts/activate
    else
        # MacOS / Linux
        source venv/bin/activate
    fi
fi

# Fallback: install requirements automatically if you want
# pip install -r requirements.txt > /dev/null

# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH:+${PYTHONPATH}:}."

# Run the server using python module execution (most reliable across OS)
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
