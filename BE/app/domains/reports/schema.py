from datetime import date as dt_date

from pydantic import BaseModel


class ReportCreate(BaseModel):
    date: dt_date | None = None


class ReportRead(BaseModel):
    report_text: str

    class Config:
        from_attributes = True


class LatestImageRead(BaseModel):
    url: str
    key: str
    timestamp: str
