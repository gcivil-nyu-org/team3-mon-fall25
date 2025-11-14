import logging
import uuid

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from PIL import Image

logger = logging.getLogger(__name__)


class S3Service:
    """Generic service class for handling S3 image operations"""

    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def upload_image(self, image_file, resource_id, folder_name="listings"):
        """
        Upload an image to S3 and return the public URL

        Args:
            image_file: Django UploadedFile object
            resource_id: ID of the resource this image belongs to
            folder_name: S3 folder/prefix to organize images (default: 'listings')

        Returns:
            str: Public URL of the uploaded image
        """
        try:
            # Validate image
            self._validate_image(image_file)

            # Generate unique filename
            file_extension = image_file.name.split(".")[-1].lower()
            unique_filename = (
                f"{folder_name}/{resource_id}/{uuid.uuid4()}.{file_extension}"
            )

            # Upload to S3 with public-read ACL
            self.s3_client.upload_fileobj(
                image_file.file,
                self.bucket_name,
                unique_filename,
                ExtraArgs={
                    "ContentType": image_file.content_type,
                    "ACL": "public-read",
                },
            )

            # Construct public URL
            public_url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{unique_filename}"  # noqa: E501

            logger.info(f"Successfully uploaded image to S3: {public_url}")
            return public_url

        except ClientError as e:
            logger.error(f"Error uploading image to S3: {str(e)}")
            raise Exception(f"Failed to upload image to S3: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error uploading image: {str(e)}")
            raise

    def delete_image(self, image_url):
        """
        Delete an image from S3 given its URL

        Args:
            image_url: Public URL of the image to delete

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Extract the key from the URL
            # URL format: https://bucket-name.s3.region.amazonaws.com/key
            key = self._extract_key_from_url(image_url)

            if not key:
                logger.warning(f"Could not extract key from URL: {image_url}")
                return False

            # Delete from S3
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)

            logger.info(f"Successfully deleted image from S3: {key}")
            return True

        except ClientError as e:
            logger.error(f"Error deleting image from S3: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting image: {str(e)}")
            return False

    def _extract_key_from_url(self, url):
        """Extract S3 key from public URL"""
        try:
            # URL format: https://bucket-name.s3.region.amazonaws.com/key
            # Split by bucket name and take everything after
            parts = url.split(
                f"{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/"
            )
            if len(parts) > 1:
                return parts[1]
            return None
        except Exception:
            return None

    def _validate_image(self, image_file):
        """
        Validate uploaded image file

        Args:
            image_file: Django UploadedFile object

        Raises:
            ValueError: If image is invalid
        """
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if image_file.size > max_size:
            raise ValueError("Image file size cannot exceed 10MB")

        # Check file extension
        allowed_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
        file_extension = image_file.name.split(".")[-1].lower()
        if file_extension not in allowed_extensions:
            raise ValueError(
                f"Invalid file extension. Allowed: {', '.join(allowed_extensions)}"
            )

        # Validate it's actually an image using Pillow
        try:
            image = Image.open(image_file)
            image.verify()
            # Reset file pointer after verify
            image_file.seek(0)
        except Exception:
            raise ValueError("Invalid image file")


# Lazy singleton pattern for test compatibility
_s3_service_instance = None


def get_s3_service():
    """
    Get or create the S3Service singleton instance.
    Uses lazy initialization to allow proper mocking in tests.
    """
    global _s3_service_instance
    if _s3_service_instance is None:
        _s3_service_instance = S3Service()
    return _s3_service_instance


def _reset_s3_service():
    """
    Reset the singleton instance. For testing purposes only.
    """
    global _s3_service_instance
    _s3_service_instance = None


# Backwards compatibility: expose as s3_service
class _S3ServiceProxy:
    """Proxy that delegates to the lazy singleton"""

    def __getattr__(self, name):
        return getattr(get_s3_service(), name)


s3_service = _S3ServiceProxy()
