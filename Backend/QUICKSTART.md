# Quick Start Guide

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
```

### Step 2: Configure Environment

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
uvicorn app.main:app --reload
```

### Step 5: Test the API

Open your browser and visit:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## Using Docker Compose (Recommended)

Even faster setup with Docker:

```bash
# 1. Setup environment
cp .env.example .env

# 2. Add ML models to ml_models/

# 3. Start everything
docker-compose up --build
```

That's it! The API will be running at http://localhost:8000

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
