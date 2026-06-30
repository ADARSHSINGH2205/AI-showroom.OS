from fastapi import HTTPException, status


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_bill_image(content_type: str | None, content: bytes, max_bytes: int) -> str:
    normalized_type = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, and WebP bill images are accepted.",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Bill image is empty.")
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Bill image must be {max_bytes // (1024 * 1024)} MB or smaller.")

    valid_signature = (
        normalized_type == "image/jpeg" and content.startswith(b"\xff\xd8\xff")
    ) or (
        normalized_type == "image/png" and content.startswith(b"\x89PNG\r\n\x1a\n")
    ) or (
        normalized_type == "image/webp"
        and len(content) >= 12
        and content[:4] == b"RIFF"
        and content[8:12] == b"WEBP"
    )
    if not valid_signature:
        raise HTTPException(status_code=400, detail="The uploaded file content does not match its image type.")
    return normalized_type
