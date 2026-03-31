from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .model import Report


KST = timezone(timedelta(hours=9))


def _kst_day_range(target_date: date) -> tuple[datetime, datetime]:
    start = datetime(
        target_date.year,
        target_date.month,
        target_date.day,
        tzinfo=KST,
    )
    end = start + timedelta(days=1)
    return start, end


# 여러 개의 리포트가 생성되면 제일 최신 데일리 리포트만 가져오도록 함
# 일단은 단일 리포트만 생성되고 업데이트 되는 방식이지만 DB에 강제하지 않아 안전하게 처리
async def get_latest_report(
    db: AsyncSession, *, device_id: int, target_date: date | None
) -> Report | None:
    stmt = select(Report).where(Report.device_id == device_id)

    if target_date is not None:
        start, end = _kst_day_range(target_date)
        stmt = stmt.where(Report.ts >= start, Report.ts < end)

    stmt = stmt.order_by(Report.ts.desc(), Report.id.desc()).limit(1)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def create_report(
    db: AsyncSession, *, device_id: int, ts: datetime, report_text: str
) -> Report:
    report = Report(
        device_id=device_id,
        ts=ts,
        report_text=report_text,
    )
    db.add(report)
    await db.flush()
    return report


async def update_report(
    db: AsyncSession, *, report: Report, ts: datetime, report_text: str
) -> Report:
    report.ts = ts
    report.report_text = report_text
    await db.flush()
    return report
