from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/user", tags=["Profile"])


def _serialize_profile(user: User) -> dict:
    """Convert user model to profile response dict, handling medicines list."""
    medicines_list = None
    if user.medicines:
        medicines_list = [m.strip() for m in user.medicines.split(",") if m.strip()]

    computed_age = None
    if user.date_of_birth:
        today = date.today()
        computed_age = today.year - user.date_of_birth.year - (
            (today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day)
        )

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "phone": user.phone,
        "date_of_birth": user.date_of_birth,
        "age": computed_age,
        "gender": user.gender,
        "symptoms": user.symptoms,
        "medicines": medicines_list,
        "created_at": user.created_at,
    }


@router.get("/profile/", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile.

    Returns:
        Full user profile including extended fields

    Raises:
        HTTPException 401: If not authenticated
    """
    return _serialize_profile(current_user)


@router.put("/profile/", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.

    Args:
        profile_data: Fields to update (all optional)

    Returns:
        Updated user profile

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If username already taken
    """
    # Check if new username is taken by another user
    # if profile_data.username and profile_data.username != current_user.username:
    #     existing = db.query(User).filter(
    #         User.username == profile_data.username,
    #         User.id != current_user.id
    #     ).first()
    #     if existing:
    #         raise HTTPException(
    #             status_code=status.HTTP_400_BAD_REQUEST,
    #             detail="Username already taken"
    #         )
    #     current_user.username = profile_data.username

    if profile_data.phone is not None:
        current_user.phone = profile_data.phone

    if profile_data.date_of_birth is not None:
        current_user.date_of_birth = profile_data.date_of_birth

    if profile_data.gender is not None:
        current_user.gender = profile_data.gender

    if profile_data.symptoms is not None:
        current_user.symptoms = profile_data.symptoms

    if profile_data.medicines is not None:
        # Store list as comma-separated string
        current_user.medicines = ",".join(profile_data.medicines)

    db.commit()
    db.refresh(current_user)

    return _serialize_profile(current_user)
