from pydantic import BaseModel
from typing import Optional

# request

class DeviceCreate(BaseModel):
    serial_no: str
    model_name: str
    firmware_version: str


class DeviceUpdate(BaseModel):
    model_name: Optional[str] = None
    firmware_version: Optional[str] = None


# response

class DeviceRead(BaseModel):
    id: int
    serial_no: str
    model_name: str
    firmware_version: str

    class Config:
        from_attributes = True