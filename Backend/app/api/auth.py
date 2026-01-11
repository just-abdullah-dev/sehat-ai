from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token, RefreshTokenRequest
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Args:
        user_data: User registration details (email, username, password)
        db: Database session

    Returns:
        Created user information (without password)

    Raises:
        HTTPException 400: If email or username already exists
    """
    user = AuthService.register_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT tokens.

    Args:
        login_data: User login credentials (email, password)
        db: Database session

    Returns:
        JWT access and refresh tokens

    Raises:
        HTTPException 401: If credentials are invalid
    """
    tokens = AuthService.login_user(db, login_data)
    return tokens


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Generate new access token using refresh token.

    Args:
        token_data: Refresh token
        db: Database session

    Returns:
        New JWT access and refresh tokens

    Raises:
        HTTPException 401: If refresh token is invalid or expired
    """
    tokens = AuthService.refresh_access_token(db, token_data.refresh_token)
    return tokens
