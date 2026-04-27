from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError


class InvalidImageError(ValueError):
    pass


ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def validate_image_upload(
    filename: str,
    content_type: str | None,
    image_bytes: bytes,
) -> None:
    if not filename:
        raise InvalidImageError("파일명이 없는 업로드입니다.")

    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise InvalidImageError("지원하지 않는 파일 형식입니다. PNG, JPG, JPEG, WEBP만 가능합니다.")

    if content_type and content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise InvalidImageError("업로드 MIME 타입이 올바르지 않습니다.")

    if not image_bytes:
        raise InvalidImageError("비어 있는 파일은 업로드할 수 없습니다.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise InvalidImageError("파일 크기는 10MB 이하여야 합니다.")

    _validate_raster_image(image_bytes)


def _validate_raster_image(image_bytes: bytes) -> None:
    try:
        image = Image.open(BytesIO(image_bytes))
        image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("유효한 이미지 파일이 아닙니다.") from exc
