from datetime import date
from pydantic import BaseModel, Field


class DeviceLinkRequest(BaseModel):
    serial_no: str = Field(..., min_length=1)


class DeviceLinkResponse(BaseModel):
    device_id: int
    serial_no: str


class UserMeResponse(BaseModel):
    id: int
    email: str
    nickname: str
    name: str | None = None
    birth: date | None = None
    device_id: int | None = None


class UserNicknameUpdate(BaseModel):
    nickname: str = Field(..., max_length=50, min_length=1)
