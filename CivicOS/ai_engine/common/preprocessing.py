import cv2
import numpy as np

def letterbox_image(image, target_size=(640, 640)):
    """
    Resizes image to target_size while maintaining aspect ratio,
    padding the remaining areas with gray.
    """
    ih, iw = image.shape[:2]
    tw, th = target_size

    scale = min(tw / iw, th / ih)
    nw = int(iw * scale)
    nh = int(ih * scale)

    image_resized = cv2.resize(image, (nw, nh))

    # Create gray canvas
    canvas = np.full((th, tw, 3), 114, dtype=np.uint8)

    # Center the image on the canvas
    dx = (tw - nw) // 2
    dy = (th - nh) // 2
    canvas[dy:dy+nh, dx:dx+nw] = image_resized

    return canvas

def grayscale_conversion(image):
    """Converts image to grayscale for specific processing tasks."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
