from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user import User
from app.models.scan import ScanHistory, ModelType
from datetime import datetime


class HistoryService:
    """Service for managing scan history"""

    @staticmethod
    def get_user_history(
        db: Session,
        user: User,
        model_filter: Optional[ModelType] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[ScanHistory], int]:
        """
        Get user's scan history with optional filtering.

        Args:
            db: Database session
            user: User object
            model_filter: Optional filter by model type
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            Tuple of (scan_list, total_count)
        """
        query = db.query(ScanHistory).filter(ScanHistory.user_id == user.id)

        # Apply model filter if specified
        if model_filter:
            query = query.filter(ScanHistory.model_used == model_filter)

        # Get total count
        total_count = query.count()

        # Get paginated results, ordered by most recent first
        scans = query.order_by(ScanHistory.created_at.desc()).limit(limit).offset(offset).all()

        return scans, total_count

    @staticmethod
    def get_scan_by_id(db: Session, scan_id: int, user: User) -> Optional[ScanHistory]:
        """
        Get specific scan by ID for a user.

        Args:
            db: Database session
            scan_id: Scan record ID
            user: User object

        Returns:
            Scan record if found and belongs to user, None otherwise
        """
        return db.query(ScanHistory).filter(
            ScanHistory.id == scan_id,
            ScanHistory.user_id == user.id
        ).first()
