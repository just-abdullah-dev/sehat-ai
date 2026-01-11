from fastapi import UploadFile
from app.utils.file_handler import FileHandler
from app.core.config import settings


class StorageService:
    """Service for managing file storage"""

    @staticmethod
    async def save_uploaded_image(file: UploadFile) -> tuple[str, str]:
        """
        Save uploaded X-ray image.

        Args:
            file: Uploaded image file

        Returns:
            Tuple of (file_path, file_url)

        Raises:
            HTTPException: If validation or save fails
        """
        # Validate file
        await FileHandler.validate_upload_file(file)

        # Save file to uploads directory
        file_path, file_url = await FileHandler.save_upload_file(
            file,
            settings.UPLOAD_DIR
        )

        return file_path, file_url

    @staticmethod
    def delete_image(file_path: str) -> bool:
        """
        Delete an image from storage.

        Args:
            file_path: Path to image file

        Returns:
            True if deleted successfully, False otherwise
        """
        return FileHandler.delete_file(file_path)

    @staticmethod
    def get_image_bytes(file_path: str) -> bytes:
        """
        Read image file as bytes.

        Args:
            file_path: Path to image file

        Returns:
            Image file bytes

        Raises:
            FileNotFoundError: If file doesn't exist
        """
        with open(file_path, "rb") as f:
            return f.read()
