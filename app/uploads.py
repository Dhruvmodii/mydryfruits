from __future__ import annotations

import os
from io import BytesIO

from flask import current_app

try:
    import cloudinary
    import cloudinary.uploader as cloudinary_uploader
except ImportError:
    cloudinary = None
    cloudinary_uploader = None


def _configured() -> bool:
    return bool(
        current_app.config.get("CLOUDINARY_CLOUD_NAME")
        and current_app.config.get("CLOUDINARY_API_KEY")
        and current_app.config.get("CLOUDINARY_API_SECRET")
    )


def upload_image(file_storage, folder="mydryfruits"):
    if not file_storage or not file_storage.filename:
        raise ValueError("No file")
    if current_app.config.get("UPLOAD_DRIVER") == "cloudinary" or os.getenv("VERCEL") == "1":
        if cloudinary is None or cloudinary_uploader is None:
            raise ValueError("Install the cloudinary package")
        if not _configured():
            raise ValueError("Set CLOUDINARY_* env vars for Vercel uploads")
        cloudinary.config(
            cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
            api_key=current_app.config["CLOUDINARY_API_KEY"],
            api_secret=current_app.config["CLOUDINARY_API_SECRET"],
        )
        data = file_storage.read()
        result = cloudinary_uploader.upload(BytesIO(data), folder=folder, resource_type="image")
        return result["secure_url"], result.get("public_id")
    raise ValueError("Local disk uploads are not used on Vercel. Set UPLOAD_DRIVER=cloudinary")
