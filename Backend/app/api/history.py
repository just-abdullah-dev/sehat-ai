from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.scan import ModelType
from app.schemas.history import ScanHistoryList, ScanHistoryResponse
from app.services.history import HistoryService

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/", response_model=ScanHistoryList)
async def get_scan_history(
    model: Optional[str] = Query(None, description="Filter by model type: 'tb' or 'pneumonia'"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get authenticated user's scan history.

    Args:
        model: Optional filter by model type
        limit: Maximum number of records to return (1-500)
        offset: Number of records to skip for pagination
        current_user: Authenticated user
        db: Database session

    Returns:
        List of user's scan history records

    Raises:
        HTTPException 401: If user is not authenticated
    """
    # Parse model filter if provided
    model_filter = None
    if model:
        try:
            model_filter = ModelType(model.lower())
        except ValueError:
            # Ignore invalid model filter, return all records
            pass

    # Get scan history
    scans, total = HistoryService.get_user_history(
        db=db,
        user=current_user,
        model_filter=model_filter,
        limit=limit,
        offset=offset
    )

    return ScanHistoryList(
        total=total,
        scans=[ScanHistoryResponse.from_orm(scan) for scan in scans]
    )
