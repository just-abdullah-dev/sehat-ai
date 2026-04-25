from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.history import HistoryService
from app.services.pdf_generator import pdf_generator
import os

router = APIRouter(prefix="/report", tags=["Reports"])


@router.get("/{scan_id}")
async def get_report(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate and download PDF report for a specific scan.

    Args:
        scan_id: ID of the scan record
        current_user: Authenticated user
        db: Database session

    Returns:
        PDF file download

    Raises:
        HTTPException 404: If scan not found or doesn't belong to user
        HTTPException 500: If PDF generation fails
    """
    # Get scan record
    scan = HistoryService.get_scan_by_id(db, scan_id, current_user)

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )

    try:
        # Generate PDF report
        pdf_path = pdf_generator.generate_report(scan, current_user)

        # Return PDF file
        if os.path.exists(pdf_path):
            return FileResponse(
                path=pdf_path,
                media_type="application/pdf",
                filename=f"sehatai_report_{scan_id}.pdf"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate report"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )
