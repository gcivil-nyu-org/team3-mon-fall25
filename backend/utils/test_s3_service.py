import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from utils.s3_service import S3Service


@pytest.fixture
def s3_service():
    """Fixture to provide an instance of S3Service with a mocked boto3 client."""
    with patch("utils.s3_service.boto3.client") as mock_boto_client:
        mock_s3 = MagicMock()
        mock_boto_client.return_value = mock_s3
        service = S3Service()
        # Attach the mock to the service instance for easy access in tests
        service.s3_client = mock_s3
        service.bucket_name = "test-bucket"  # Set a mock bucket name
        yield service


@patch("utils.s3_service.Image.open")
@patch("utils.s3_service.settings")
def test_upload_image_success(mock_settings, mock_image_open, s3_service):
    """
    Verify that the upload_image method correctly calls the S3 client.
    """
    # Mock Django settings
    mock_settings.AWS_S3_REGION_NAME = "us-east-1"

    mock_file = MagicMock()
    mock_file.name = "test.jpg"
    mock_file.size = 5 * 1024 * 1024  # 5MB, valid size
    mock_file.content_type = "image/jpeg"
    listing_id = 1
    expected_key = f"listings/{listing_id}/"

    image_url = s3_service.upload_image(mock_file, listing_id)

    # Check that upload_fileobj was called correctly
    s3_service.s3_client.upload_fileobj.assert_called_once()
    args, kwargs = s3_service.s3_client.upload_fileobj.call_args
    assert args[0] == mock_file.file  # The file object (not the mock_file itself)
    assert args[1] == s3_service.bucket_name  # The bucket name
    assert args[2].startswith(expected_key)  # The generated key starts with the folder
    assert "ExtraArgs" in kwargs
    assert kwargs["ExtraArgs"]["ContentType"] == "image/jpeg"
    assert kwargs["ExtraArgs"]["ACL"] == "public-read"

    # Check that the returned URL is correct
    assert f"https://{s3_service.bucket_name}.s3.us-east-1.amazonaws.com/" in image_url
    assert expected_key in image_url


@patch("utils.s3_service.Image.open")
def test_upload_image_failure(mock_image_open, s3_service):
    """
    Verify that an exception during upload is caught and re-raised.
    """
    mock_file = MagicMock()
    mock_file.name = "fail.jpg"
    mock_file.size = 1024  # Valid size

    s3_service.s3_client.upload_fileobj.side_effect = ClientError(
        {"Error": {"Code": "500", "Message": "Internal Server Error"}},
        "upload_fileobj",
    )

    with pytest.raises(Exception, match="Failed to upload image to S3"):
        s3_service.upload_image(mock_file, 1)


@patch("utils.s3_service.settings")
def test_delete_image_success(mock_settings, s3_service):
    """
    Verify that the delete_image method correctly calls the S3 client.
    """
    # Mock Django settings
    mock_settings.AWS_S3_REGION_NAME = "us-east-1"

    image_url = f"https://{s3_service.bucket_name}.s3.us-east-1.amazonaws.com/listings/1/test.jpg"
    expected_key = "listings/1/test.jpg"

    success = s3_service.delete_image(image_url)

    s3_service.s3_client.delete_object.assert_called_once_with(
        Bucket=s3_service.bucket_name, Key=expected_key
    )
    assert success is True


def test_delete_image_failure(s3_service):
    """
    Verify that an exception during deletion is caught and handled.
    """
    s3_service.s3_client.delete_object.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "delete_object"
    )
    image_url = f"https://{s3_service.bucket_name}.s3.amazonaws.com/non-existent.jpg"

    success = s3_service.delete_image(image_url)

    assert success is False
