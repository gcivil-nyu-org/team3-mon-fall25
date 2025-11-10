import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from utils.s3_service import S3Service, _reset_s3_service


@pytest.fixture
def s3_service():
    """Fixture to provide an instance of S3Service with a mocked boto3 client."""
    # Reset singleton before each test to ensure isolation
    _reset_s3_service()

    with patch("utils.s3_service.boto3.client") as mock_boto_client:
        mock_s3 = MagicMock()
        mock_boto_client.return_value = mock_s3
        service = S3Service()
        # Attach the mock to the service instance for easy access in tests
        service.s3_client = mock_s3
        service.bucket_name = "test-bucket"  # Set a mock bucket name
        yield service

    # Reset singleton after each test
    _reset_s3_service()


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

    image_url = f"https://{s3_service.bucket_name}.s3.us-east-1.amazonaws.com/listings/1/test.jpg"  # noqa: E501
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


@patch("utils.s3_service.settings")
def test_delete_image_generic_exception(mock_settings, s3_service):
    """
    Verify that a generic exception during deletion is caught and handled.
    """
    mock_settings.AWS_S3_REGION_NAME = "us-east-1"
    s3_service.s3_client.delete_object.side_effect = Exception("Unexpected error")
    image_url = f"https://{s3_service.bucket_name}.s3.us-east-1.amazonaws.com/listings/1/test.jpg"  # noqa: E501

    success = s3_service.delete_image(image_url)

    assert success is False


@patch("utils.s3_service.settings")
def test_delete_image_invalid_url(mock_settings, s3_service):
    """
    Verify that delete_image handles invalid URLs gracefully.
    """
    mock_settings.AWS_S3_REGION_NAME = "us-east-1"
    # URL that won't match the expected format
    invalid_url = "http://invalid-url.com/image.jpg"

    success = s3_service.delete_image(invalid_url)

    # Should return False because key extraction fails
    assert success is False


@patch("utils.s3_service.Image.open")
def test_upload_image_generic_exception(mock_image_open, s3_service):
    """
    Verify that a generic (non-ClientError) exception during upload is caught
    and re-raised.
    """
    mock_file = MagicMock()
    mock_file.name = "test.jpg"
    mock_file.size = 1024  # Valid size

    # Simulate a generic exception (not ClientError)
    s3_service.s3_client.upload_fileobj.side_effect = Exception("Network timeout")

    with pytest.raises(Exception, match="Network timeout"):
        s3_service.upload_image(mock_file, 1)


@patch("utils.s3_service.Image.open")
def test_validate_image_file_too_large(mock_image_open, s3_service):
    """
    Verify that files larger than 10MB are rejected.
    """
    mock_file = MagicMock()
    mock_file.name = "large.jpg"
    mock_file.size = 11 * 1024 * 1024  # 11MB, exceeds limit

    with pytest.raises(ValueError, match="Image file size cannot exceed 10MB"):
        s3_service.upload_image(mock_file, 1)


@patch("utils.s3_service.Image.open")
def test_validate_image_invalid_extension(mock_image_open, s3_service):
    """
    Verify that files with invalid extensions are rejected.
    """
    mock_file = MagicMock()
    mock_file.name = "document.pdf"  # Invalid extension
    mock_file.size = 1024  # Valid size

    with pytest.raises(ValueError, match="Invalid file extension"):
        s3_service.upload_image(mock_file, 1)


@patch("utils.s3_service.Image.open")
def test_validate_image_corrupted_file(mock_image_open, s3_service):
    """
    Verify that corrupted image files are rejected.
    """
    mock_file = MagicMock()
    mock_file.name = "corrupted.jpg"
    mock_file.size = 1024  # Valid size

    # Simulate Image.open raising an exception for corrupted file
    mock_image_open.side_effect = Exception("Cannot identify image file")

    with pytest.raises(ValueError, match="Invalid image file"):
        s3_service.upload_image(mock_file, 1)


@patch("utils.s3_service.settings")
def test_extract_key_from_url_exception_handling(mock_settings, s3_service):
    """
    Verify that _extract_key_from_url handles exceptions gracefully.
    """
    mock_settings.AWS_S3_REGION_NAME = "us-east-1"

    # Test with None (will cause AttributeError when calling .split())
    result = s3_service._extract_key_from_url(None)
    assert result is None

    # Test with non-matching URL
    result = s3_service._extract_key_from_url("http://different-bucket.com/image.jpg")
    assert result is None
