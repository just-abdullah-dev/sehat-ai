import random
import string
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token
from app.services.email import EmailService
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Service class for authentication operations"""

    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        """
        Register a new user.

        Args:
            db: Database session
            user_data: User registration data

        Returns:
            Created user object

        Raises:
            HTTPException: If email already exists
        """
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    
        # Create new user
        hashed_pwd = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_pwd
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    @staticmethod
    def login_user(db: Session, login_data: UserLogin) -> Token:
        """
        Authenticate user and generate tokens.

        Args:
            db: Database session
            login_data: User login credentials

        Returns:
            JWT tokens (access and refresh)

        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user by email
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return Token(
            access_token=access_token,
            refresh_token=refresh_token
        )

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Token:
        """
        Generate new access token using refresh token.

        Args:
            db: Database session
            refresh_token: Refresh token

        Returns:
            New JWT tokens

        Raises:
            HTTPException: If refresh token is invalid
        """
        # Decode refresh token
        payload = decode_token(refresh_token)

        # Verify token type
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        # Get user ID
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # Verify user exists
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Generate new tokens
        new_access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )

    # ── Password Reset ────────────────────────────────────────────────────────

    @staticmethod
    def request_password_reset(db: Session, email: str) -> dict:
        """
        Generate and store a 6-digit OTP for password reset.
        Send OTP email when the account exists.
        """
        user = db.query(User).filter(User.email == email).first()
        # Always return success to avoid email enumeration attacks
        if not user:
            return {"message": "If that email exists, an OTP has been sent.", "dev_otp": None}

        otp = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        user.reset_otp = otp
        user.reset_otp_expires_at = expires_at
        db.commit()

        try:
            EmailService.send_password_reset_otp(user.email, otp)
        except Exception:
            # Keep response generic but surface a retriable server error for real users.
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to send OTP email right now. Please try again shortly."
            )

        dev_otp = otp if settings.DEBUG else None
        if settings.DEBUG:
            logger.info("Password reset OTP sent to %s (dev otp enabled)", user.email)

        return {"message": "If that email exists, an OTP has been sent.", "dev_otp": dev_otp}

    @staticmethod
    def verify_reset_otp(db: Session, email: str, otp: str) -> dict:
        """
        Verify the OTP is correct and not expired.
        Does NOT clear the OTP yet — that happens on final reset.
        """
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.reset_otp or not user.reset_otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        if datetime.now(timezone.utc) > user.reset_otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new one."
            )

        if user.reset_otp != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect OTP"
            )

        return {"message": "OTP verified successfully"}

    @staticmethod
    def reset_password(db: Session, email: str, otp: str, new_password: str) -> dict:
        """
        Verify OTP one final time, then update the password and clear OTP fields.
        """
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.reset_otp or not user.reset_otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        if datetime.now(timezone.utc) > user.reset_otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new one."
            )

        if user.reset_otp != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect OTP"
            )

        user.hashed_password = hash_password(new_password)
        user.reset_otp = None
        user.reset_otp_expires_at = None
        db.commit()

        return {"message": "Password reset successfully"}
