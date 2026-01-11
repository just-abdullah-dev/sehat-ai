# SehatAI Backend Implementation Plan

## Project Overview
FastAPI-based backend for medical image analysis (TB & Pneumonia detection) with JWT authentication, PostgreSQL database, ML model inference, and PDF report generation.

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure (COMPLETED)
- [x] **Task 1.1**: Create project directory structure (COMPLETED)
  - app/
    - api/ (endpoints)
    - core/ (config, security)
    - models/ (database models)
    - schemas/ (pydantic schemas)
    - services/ (business logic)
    - ml/ (ML model handlers)
    - utils/ (helpers)
  - ml_models/ (store .h5 files)
  - uploads/ (temporary image storage)
  - reports/ (generated PDFs)

- [x] **Task 1.2**: Create requirements.txt with dependencies (COMPLETED)
  - fastapi
  - uvicorn[standard]
  - python-jose[cryptography] (JWT)
  - passlib[bcrypt] (password hashing)
  - python-multipart (file uploads)
  - sqlalchemy (ORM)
  - psycopg2-binary (PostgreSQL)
  - tensorflow (ML models)
  - pillow (image processing)
  - reportlab (PDF generation)
  - python-dotenv (environment variables)
  - pydantic-settings

- [x] **Task 1.3**: Create .env.example for environment variables (COMPLETED)
  - DATABASE_URL
  - JWT_SECRET_KEY
  - JWT_ALGORITHM
  - ACCESS_TOKEN_EXPIRE_MINUTES
  - REFRESH_TOKEN_EXPIRE_DAYS

---

### Phase 2: Database Layer (COMPLETED)
- [x] **Task 2.1**: Set up database configuration (app/core/database.py) (COMPLETED)
  - SQLAlchemy engine
  - SessionLocal
  - Base class

- [x] **Task 2.2**: Create User model (app/models/user.py) (COMPLETED)
  - id, email, username, hashed_password
  - created_at, updated_at

- [x] **Task 2.3**: Create ScanHistory model (app/models/scan.py) (COMPLETED)
  - id, user_id (foreign key)
  - file_url, model_used
  - result, confidence
  - created_at

- [x] **Task 2.4**: Create database initialization script (COMPLETED)
  - Create tables on startup
  - Database migration support

---

### Phase 3: Authentication & Security (COMPLETED)
- [x] **Task 3.1**: Create security utilities (app/core/security.py) (COMPLETED)
  - Password hashing functions
  - Password verification
  - JWT token creation
  - JWT token verification
  - Get current user from token

- [x] **Task 3.2**: Create authentication schemas (app/schemas/auth.py) (COMPLETED)
  - UserCreate
  - UserLogin
  - Token
  - TokenData
  - UserResponse

- [x] **Task 3.3**: Implement authentication service (app/services/auth.py) (COMPLETED)
  - Register user
  - Login user
  - Refresh token
  - Verify credentials

- [x] **Task 3.4**: Create auth endpoints (app/api/auth.py) (COMPLETED)
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh

---

### Phase 4: ML Model Integration (COMPLETED)
- [x] **Task 4.1**: Create model loader (app/ml/model_loader.py) (COMPLETED)
  - Load tb_model.h5 at startup
  - Load pneumonia_model.h5 at startup
  - Keep models in memory
  - Warm-up inference

- [x] **Task 4.2**: Create image preprocessing (app/ml/preprocessing.py) (COMPLETED)
  - Resize images
  - Convert to grayscale if needed
  - Normalize pixel values
  - Convert to model input format

- [x] **Task 4.3**: Create prediction engine (app/ml/predictor.py) (COMPLETED)
  - Route to correct model (TB/Pneumonia)
  - Run inference
  - Calculate confidence
  - Return structured results

---

### Phase 5: File Handling (COMPLETED)
- [x] **Task 5.1**: Create file validation utilities (app/utils/file_handler.py) (COMPLETED)
  - Validate file type (JPG, PNG)
  - Validate file size (<10MB)
  - Generate unique filenames
  - Save files securely

- [x] **Task 5.2**: Create file storage service (app/services/storage.py) (COMPLETED)
  - Save uploaded images
  - Generate file URLs
  - Clean up old files (optional)

---

### Phase 6: Prediction API (COMPLETED)
- [x] **Task 6.1**: Create prediction schemas (app/schemas/prediction.py) (COMPLETED)
  - PredictionRequest
  - PredictionResponse
  - ModelType enum (tb/pneumonia)

- [x] **Task 6.2**: Create prediction service (app/services/prediction.py) (COMPLETED)
  - Process uploaded image
  - Call ML model
  - Save to scan history
  - Return results

- [x] **Task 6.3**: Create prediction endpoints (app/api/prediction.py) (COMPLETED)
  - POST /predict/?model=tb
  - POST /predict/?model=pneumonia
  - Authentication required
  - File upload handling
  - Response time < 10s

---

### Phase 7: Scan History (COMPLETED)
- [x] **Task 7.1**: Create history schemas (app/schemas/history.py) (COMPLETED)
  - ScanHistoryResponse
  - ScanHistoryList

- [x] **Task 7.2**: Create history service (app/services/history.py) (COMPLETED)
  - Get user scan history
  - Filter by date/model
  - Pagination support

- [x] **Task 7.3**: Create history endpoints (app/api/history.py) (COMPLETED)
  - GET /history/
  - Authentication required
  - Return user's scans

---

### Phase 8: PDF Report Generation (COMPLETED)
- [x] **Task 8.1**: Create PDF generator (app/services/pdf_generator.py) (COMPLETED)
  - Generate PDF with ReportLab
  - Include prediction details
  - Embed X-ray image
  - Add timestamp and model info
  - Support English/Urdu

- [x] **Task 8.2**: Create report endpoints (app/api/reports.py) (COMPLETED)
  - GET /report/{scan_id}
  - Authentication required
  - Return PDF file

---

### Phase 9: Main Application (COMPLETED)
- [x] **Task 9.1**: Create application configuration (app/core/config.py) (COMPLETED)
  - Settings class with pydantic
  - Environment variables
  - CORS configuration

- [x] **Task 9.2**: Create main application (app/main.py) (COMPLETED)
  - FastAPI app initialization
  - CORS middleware
  - Router registration
  - Startup events (load models, create tables)
  - Shutdown events
  - Exception handlers

- [x] **Task 9.3**: Add logging configuration (app/core/logging_config.py) (COMPLETED)
  - Request logging
  - Error logging
  - Slow inference detection (>10s)

---

### Phase 10: Docker & Deployment (COMPLETED)
- [x] **Task 10.1**: Create Dockerfile (COMPLETED)
  - Python 3.10+ base image
  - Install dependencies
  - Copy application code
  - Copy ML models
  - Expose port 8000
  - Run with uvicorn

- [x] **Task 10.2**: Create .dockerignore (COMPLETED)
  - Exclude unnecessary files
  - Virtual environments
  - Cache files

- [x] **Task 10.3**: Create docker-compose.yml (optional for local dev) (COMPLETED)
  - FastAPI service
  - PostgreSQL service
  - Volume mounts

---

### Phase 11: Testing & Validation
- [ ] **Task 11.1**: Create API tests
  - Test authentication endpoints
  - Test prediction endpoints
  - Test file upload validation

- [ ] **Task 11.2**: Test with Postman
  - Create collection
  - Test all endpoints
  - Validate responses

- [ ] **Task 11.3**: Performance testing
  - Verify inference < 10s
  - Test concurrent users
  - Memory usage monitoring

---

### Phase 12: Documentation (COMPLETED)
- [x] **Task 12.1**: Create README.md (COMPLETED)
  - Setup instructions
  - API documentation
  - Environment variables
  - Deployment guide

- [x] **Task 12.2**: API documentation (COMPLETED)
  - FastAPI auto-generated docs (/docs)
  - Example requests/responses

---

## Directory Structure
```
Backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── prediction.py
│   │   ├── history.py
│   │   └── reports.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── scan.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── prediction.py
│   │   └── history.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── prediction.py
│   │   ├── history.py
│   │   ├── storage.py
│   │   └── pdf_generator.py
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── model_loader.py
│   │   ├── preprocessing.py
│   │   └── predictor.py
│   └── utils/
│       ├── __init__.py
│       └── file_handler.py
├── ml_models/
│   ├── tb_model.h5
│   └── pneumonia_model.h5
├── uploads/
├── reports/
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env.example
├── .env
└── README.md
```

---

## Notes
- All passwords must be hashed using bcrypt
- JWT tokens must have expiration
- File uploads must be validated (type, size)
- ML models loaded once at startup
- Database sessions properly managed
- HTTPS required in production
- CORS configured for mobile app
- Logging for all requests and errors
- Error handling for all endpoints
