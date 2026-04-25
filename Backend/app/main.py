from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import time
import logging

from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import setup_logging
from app.ml.model_loader import model_loader

# Import routers
from app.api import auth, prediction, history, reports, profile

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    try:
        # Initialize database
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully")

        # Ensure storage directories exist, including Grad-CAM outputs
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.REPORT_DIR, exist_ok=True)
        os.makedirs(os.path.join(settings.REPORT_DIR, "gradcam"), exist_ok=True)
        logger.info("Storage directories verified")

        # Load ML models
        logger.info("Loading ML models...")
        model_loader.load_models()
        logger.info("ML models loaded successfully")

    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

    logger.info(f"{settings.APP_NAME} started successfully")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered medical image analysis for TB and Pneumonia detection",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Serve uploaded files publicly so the mobile app can load scan previews.
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests and measure response time"""
    start_time = time.time()

    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")

    # Process request
    response = await call_next(request)

    # Calculate processing time
    process_time = time.time() - start_time

    # Log response
    logger.info(
        f"Response: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}s"
    )

    # Flag slow requests (>10s)
    if process_time > 10:
        logger.warning(f"Slow request detected: {request.url.path} took {process_time:.2f}s")

    # Add processing time to response headers
    response.headers["X-Process-Time"] = str(process_time)

    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Include routers
app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(history.router)
app.include_router(reports.router)
app.include_router(profile.router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "models_loaded": model_loader.models_loaded,
        "docs": "/docs",
        "redoc": "/redoc"
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "models_loaded": model_loader.models_loaded
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
