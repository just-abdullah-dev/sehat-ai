from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    echo=settings.DEBUG  # Log SQL queries in debug mode
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


LEGACY_USER_COLUMNS = [
    ("phone", "VARCHAR"),
    ("date_of_birth", "DATE"),
    ("age", "INTEGER"),
    ("gender", "VARCHAR"),
    ("symptoms", "TEXT"),
    ("medicines", "TEXT"),
    ("reset_otp", "VARCHAR(6)"),
    ("reset_otp_expires_at", "TIMESTAMP WITH TIME ZONE"),
]


def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    Called on application startup.
    """
    Base.metadata.create_all(bind=engine)
    # Keep existing databases in sync with newer User model fields.
    with engine.begin() as connection:
        for column_name, column_type in LEGACY_USER_COLUMNS:
            connection.execute(
                text(
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_type};"
                )
            )
