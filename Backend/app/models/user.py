from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    """User model for authentication and user management"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Extended profile fields
    phone = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)      # 'male', 'female', 'other'
    symptoms = Column(Text, nullable=True)
    medicines = Column(Text, nullable=True)     # comma-separated list

    # Password reset OTP fields
    reset_otp = Column(String(6), nullable=True)
    reset_otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship with scans
    scans = relationship("ScanHistory", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
