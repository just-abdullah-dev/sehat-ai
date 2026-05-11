# Quick Start Guide

## Always Start Here (Every Time You Open The Project)

Run these commands from the Backend folder.

### Windows PowerShell

```powershell
cd "c:\Users\HC\Downloads\WORK\Sehat-AI-FYP\sehat-ai\Backend"

# First-time only (or if venv is broken):
py -3.11 -m venv venv

# Activate environment:
.\venv\Scripts\Activate.ps1

# Install/refresh dependencies:
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install email-validator

# Start API:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Mac/Linux

```bash
cd Backend

# First-time only:
python3.11 -m venv venv

# Activate environment:
source venv/bin/activate

# Install/refresh dependencies:
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install email-validator

# Start API:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

When running correctly:
- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

Important:
- Do not run `python .\app\main.py` or `python app/main.py`
- Use module mode: `python -m uvicorn app.main:app ...` or `python -m app.main`

## Get Started in 5 Minutes

### Prerequisites
- Python 3.10+ installed
- PostgreSQL running (or use Docker Compose)
- ML model files (.h5) ready

### Step 1: Setup Environment

```bash
# Create virtual environment
python -m venv venv 
# or 
py -3.11 -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install email-validator
```

### Step 2: Configure Environment
<!-- testing  -->
```bash
# Copy environment template
cp .env.example .env

# Edit .env file and set:
# - DATABASE_URL (your PostgreSQL connection string)
# - JWT_SECRET_KEY (generate a random secure key)
```

### Step 3: Add ML Models

Place your trained models in the `ml_models/` directory:
```
ml_models/
├── tb_model.h5
└── pneumonia_model.h5
```

### Step 4: Run the Application

```bash
# Using Python directly
python -m app.main

# OR using uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 5: Test the API

Open your browser and visit:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## Using Docker Compose

Run these commands from the `Backend` folder.

### Development (hot reload)

```bash
# 1. Setup environment
cp .env.example .env

# 2. Add ML models to ml_models/

# 3. Start DB + backend in development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production-like run (no reload, multi-worker)

```bash
# 1. Setup environment
cp .env.example .env

# 2. Add ML models to ml_models/

# 3. Start DB + backend in production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Stop containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# or
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

The API will run at http://localhost:8000

---

## First API Call

### 1. Register a User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Copy the `access_token` from the response.

### 3. Upload X-ray for Prediction
```bash
curl -X POST "http://localhost:8000/predict/?model=tb" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@path/to/xray.jpg"
```

### 4. View History
```bash
curl -X GET "http://localhost:8000/history/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

**No module named 'app'?**
- You are likely running the file directly
- Use: `python -m uvicorn app.main:app --reload`

**email-validator is not installed?**
- Run: `pip install email-validator`

**Database Connection Error?**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env

**Models Not Loading?**
- Verify .h5 files are in ml_models/
- Check file permissions

**CORS Error from Frontend?**
- Add your frontend URL to ALLOWED_ORIGINS in .env

---

For full documentation, see [README.md](README.md)
