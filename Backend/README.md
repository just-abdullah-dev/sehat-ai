# SehatAI Backend

AI-powered medical image analysis backend for Tuberculosis (TB) and Pneumonia detection using deep learning.

## Features

- **JWT Authentication**: Secure user registration and login
- **ML Model Inference**: TB and Pneumonia detection using TensorFlow/Keras models
- **Image Upload**: Secure X-ray image upload and validation
- **Scan History**: Track and manage prediction history
- **PDF Reports**: Generate downloadable medical reports (English/Urdu)
- **REST API**: Well-documented REST API with FastAPI
- **Docker Support**: Containerized deployment
- **PostgreSQL Database**: Robust data storage

## Technology Stack

- **Framework**: FastAPI
- **ML Framework**: TensorFlow 2.15
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (python-jose)
- **PDF Generation**: ReportLab
- **Server**: Uvicorn (ASGI)
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Python 3.10+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

## Project Structure

```
Backend/
├── app/
│   ├── api/              # API endpoints
│   ├── core/             # Core configuration
│   ├── models/           # Database models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── ml/               # ML models and prediction
│   └── utils/            # Utility functions
├── ml_models/            # Trained ML models (.h5)
├── uploads/              # Uploaded images
├── reports/              # Generated PDF reports
├── logs/                 # Application logs
├── requirements.txt      # Python dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose config
└── .env                  # Environment variables
```

## Installation

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   cd Backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Setup PostgreSQL database**
   ```bash
   # Create database
   createdb sehatai_db

   # Update DATABASE_URL in .env
   DATABASE_URL=postgresql://user:password@localhost:5432/sehatai_db
   ```

6. **Add ML models**
   ```bash
   # Place your trained models in ml_models/
   ml_models/tb_model.h5
   ml_models/pneumonia_model.h5
   ```

7. **Run the application**
   ```bash
   python -m app.main
   # Or use uvicorn directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option 2: Docker Deployment

1. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Add ML models**
   ```bash
   # Place your trained models in ml_models/
   ml_models/tb_model.h5
   ml_models/pneumonia_model.h5
   ```

3. **Build and run with Docker Compose**

   Development (hot reload):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

   Production-like (no reload, multi-worker):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
   ```

The API will be available at `http://localhost:8000`

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sehatai_db

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# ML Models
TB_MODEL_PATH=ml_models/tb_model.h5
PNEUMONIA_MODEL_PATH=ml_models/pneumonia_model.h5
```

## API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT tokens
- `POST /auth/refresh` - Refresh access token

### Prediction
- `POST /predict/?model=tb` - TB detection
- `POST /predict/?model=pneumonia` - Pneumonia detection

### History
- `GET /history/` - Get user's scan history
- `GET /history/?model=tb` - Filter by model type

### Reports
- `GET /report/{scan_id}` - Download PDF report
- `GET /report/{scan_id}?language=ur` - Get Urdu report

### Health
- `GET /` - API information
- `GET /health` - Health check

## Usage Examples

### 1. Register User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "securepassword123"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 3. Upload and Predict
```bash
curl -X POST "http://localhost:8000/predict/?model=tb" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/xray.jpg"
```

### 4. Get History
```bash
curl -X GET "http://localhost:8000/history/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Download Report
```bash
curl -X GET "http://localhost:8000/report/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --output report.pdf
```

## ML Models

The backend expects two trained Keras models:

1. **tb_model.h5**: Tuberculosis detection model
2. **pneumonia_model.h5**: Pneumonia detection model

### Model Requirements
- Input shape: (224, 224, 3) RGB images
- Output: Binary classification (Normal/Positive)
- Format: Keras .h5 format

Place your trained models in the `ml_models/` directory before running the application.

## Security Features

- **Password Hashing**: Bcrypt with salt
- **JWT Authentication**: Secure token-based auth
- **File Validation**: Type and size validation
- **SQL Injection Protection**: SQLAlchemy ORM
- **CORS**: Configurable origins
- **HTTPS**: Recommended for production

## Performance

- **Model Loading**: Models loaded at startup (warm-up inference)
- **Inference Time**: < 10 seconds (requirement)
- **Concurrent Users**: Supports 100+ concurrent users
- **Caching**: Models kept in memory for fast inference

## Logging

Logs are stored in:
- Console output (stdout)
- `logs/app.log` file

Log levels:
- INFO: General information
- WARNING: Slow requests (>10s)
- ERROR: Error events

## Testing

Access the interactive API documentation to test endpoints:
- Swagger UI: http://localhost:8000/docs

## Deployment

### Cloud Platforms

The application can be deployed to:
- **Google Cloud Run**
- **Railway**
- **Render**
- **AWS ECS**
- **Azure Container Instances**

### Deployment Checklist

1. Set `DEBUG=False` in production
2. Use strong `JWT_SECRET_KEY`
3. Configure proper `ALLOWED_ORIGINS`
4. Use managed PostgreSQL database
5. Enable HTTPS
6. Set up proper logging and monitoring
7. Configure auto-restart on failure
8. Set up database backups

## Troubleshooting

### Models not loading
- Ensure models exist in `ml_models/` directory
- Check file permissions
- Verify model format (.h5)

### Database connection errors
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check network connectivity

### CORS errors
- Add your frontend URL to ALLOWED_ORIGINS
- Restart the server after changing .env

### Slow predictions
- Check model size and complexity
- Monitor system resources
- Consider GPU acceleration

## Contributing

1. Follow PEP 8 style guide
2. Add docstrings to all functions
3. Update documentation for new features
4. Test endpoints before committing

## License

This project is part of the SehatAI FYP.

## Support

For issues and questions, please create an issue in the repository.

---

**Note**: This backend requires trained ML models to function. Ensure you have the required `.h5` model files before deployment.
