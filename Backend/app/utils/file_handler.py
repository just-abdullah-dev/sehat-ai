import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings


class FileHandler:
    """Utility class for file validation and handling"""

    @staticmethod
    def validate_file_type(filename: str) -> bool:
        """
        Validate if file extension is allowed.

        Args:
            filename: Name of the file

        Returns:
            True if file type is allowed, False otherwise
        """
        allowed_extensions = settings.allowed_extensions_list
        file_extension = filename.rsplit(".", 1)[-1].lower()
        return file_extension in allowed_extensions

    @staticmethod
    def validate_file_size(file_size: int) -> bool:
        """
        Validate if file size is within limits.

        Args:
            file_size: Size of file in bytes

        Returns:
            True if file size is valid, False otherwise
        """
        return file_size <= settings.MAX_UPLOAD_SIZE

    @staticmethod
    def generate_unique_filename(original_filename: str) -> str:
        """
        Generate unique filename to prevent conflicts.

        Args:
            original_filename: Original filename

        Returns:
            Unique filename with UUID prefix
        """
        file_extension = original_filename.rsplit(".", 1)[-1].lower()
        unique_id = uuid.uuid4().hex
        return f"{unique_id}.{file_extension}"

    @staticmethod
    async def validate_upload_file(file: UploadFile) -> None:
        """
        Validate uploaded file (type and size).

        Args:
            file: Uploaded file

        Raises:
            HTTPException: If file validation fails
        """
        # Validate file type
        if not FileHandler.validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(settings.allowed_extensions_list)}"
            )

        # Read file to check size
        contents = await file.read()
        file_size = len(contents)

        # Reset file pointer for later use
        await file.seek(0)

        # Validate file size
        if not FileHandler.validate_file_size(file_size):
            max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_size_mb}MB"
            )

    @staticmethod
    async def save_upload_file(file: UploadFile, directory: str) -> tuple[str, str]:
        """
        Save uploaded file to specified directory.

        Args:
            file: Uploaded file
            directory: Directory to save file

        Returns:
            Tuple of (file_path, file_url)

        Raises:
            HTTPException: If file save fails
        """
        try:
            # Create directory if it doesn't exist
            save_dir = Path(directory)
            save_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            unique_filename = FileHandler.generate_unique_filename(file.filename)
            file_path = save_dir / unique_filename

            # Save file
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            # Generate file URL (relative path)
            file_url = f"{directory}/{unique_filename}"

            return str(file_path), file_url

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )

    @staticmethod
    def delete_file(file_path: str) -> bool:
        """
        Delete a file from filesystem.

        Args:
            file_path: Path to file

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
