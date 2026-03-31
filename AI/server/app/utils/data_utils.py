import base64
import io


def base64_to_bytesio(base64_str: str) -> io.BytesIO:
    """
    _summary_

    Args:
        base64_str (str): _description_

    Returns:
        io.BytesIO: _description_
    """

    if "," in base64_str:
        base64_str = base64_str.split(",")[1]

    audio_bytes = base64.b64decode(base64_str)
    return io.BytesIO(audio_bytes)


def bytes_to_base64(audio_bytes: bytes) -> str:
    """
    _summary_

    Args:
        audio_bytes (bytes): _description_

    Returns:
        str: _description_
    """
    return base64.b64encode(audio_bytes).decode("utf-8")
