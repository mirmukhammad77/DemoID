import base64
import io
import warnings

import cv2
import numpy as np
from PIL import Image

from app.dtos.image_dto import MAX_IMAGE_BYTES
from app.errors import InvalidImage

MAX_PIXELS = 20_000_000


def decode_image(encoded: str) -> np.ndarray:
    try:
        data = base64.b64decode(encoded, validate=True)
        if not 0 < len(data) <= MAX_IMAGE_BYTES:
            raise InvalidImage()
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in {"JPEG", "PNG"} or getattr(image, "n_frames", 1) != 1:
                    raise InvalidImage()
                if not 0 < image.width * image.height <= MAX_PIXELS:
                    raise InvalidImage()
                image.load()
                rgb = np.asarray(image.convert("RGB"))
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception:
        raise InvalidImage() from None
