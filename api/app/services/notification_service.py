from collections.abc import Iterable
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.enums import NotificationChannel, NotificationStatus
from app.models.notification_delivery import NotificationDelivery
from app.models.notification_subscription import NotificationSubscription
from app.models.report import Report
from app.models.user import User
from app.services.event_service import add_report_event
from app.services.notify_service import build_share_url, send_email_sendgrid, send_whatsapp


def _channels_to_strings(channels: Iterable[NotificationChannel]) -> list[str]:
    out: list[str] = []
    for channel in channels:
        value = channel.value
        if value not in out:
            out.append(value)
    return out


def _channels_from_raw(raw: list | None) -> list[NotificationChannel]:
    channels: list[NotificationChannel] = []
    if not raw:
        return channels
    for item in raw:
        try:
            channel = NotificationChannel(str(item))
        except ValueError:
            continue
        if channel not in channels:
            channels.append(channel)
    return channels


def upsert_subscription(
    db: Session,
    *,
    report_id: UUID,
    user: User | None,
    device_id: str | None,
    email: str | None,
    whatsapp_number: str | None,
    channels: list[NotificationChannel],
) -> NotificationSubscription:
    if not channels:
        channels = [NotificationChannel.PUSH]
    if user is None and not device_id and not email and not whatsapp_number:
        raise ValueError("subscription requires user, device_id, email, or whatsapp_number")

    conditions = [NotificationSubscription.report_id == report_id]
    if user is not None:
        conditions.append(NotificationSubscription.user_id == user.id)
    elif device_id:
        conditions.append(NotificationSubscription.device_id == device_id)
    elif email:
        conditions.append(NotificationSubscription.email == email)
    elif whatsapp_number:
        conditions.append(NotificationSubscription.whatsapp_number == whatsapp_number)

    existing = db.scalar(select(NotificationSubscription).where(and_(*conditions)))
    if existing is None:
        existing = NotificationSubscription(
            report_id=report_id,
            user_id=user.id if user else None,
            device_id=device_id,
            email=email or (user.email if user else None),
            whatsapp_number=whatsapp_number or (user.phone if user else None),
            channels=_channels_to_strings(channels),
            active=True,
        )
        db.add(existing)
        db.flush()
        return existing

    merged = _channels_from_raw(existing.channels)
    for channel in channels:
        if channel not in merged:
            merged.append(channel)
    existing.channels = _channels_to_strings(merged)
    existing.active = True
    if device_id:
        existing.device_id = device_id
    if email:
        existing.email = email
    if whatsapp_number:
        existing.whatsapp_number = whatsapp_number
    db.flush()
    return existing


def auto_subscribe_reporter(db: Session, report: Report) -> NotificationSubscription | None:
    if report.device_id is None and report.user_id is None:
        return None
    user = db.scalar(select(User).where(User.id == report.user_id)) if report.user_id else None
    return upsert_subscription(
        db,
        report_id=report.id,
        user=user,
        device_id=report.device_id,
        email=None,
        whatsapp_number=None,
        channels=[NotificationChannel.PUSH],
    )


def queue_status_notifications(
    db: Session,
    *,
    report: Report,
    actor: str,
    web_base_url: str,
) -> list[NotificationDelivery]:
    subscriptions = db.scalars(
        select(NotificationSubscription).where(
            NotificationSubscription.report_id == report.id,
            NotificationSubscription.active.is_(True),
        )
    ).all()
    if not subscriptions:
        return []

    share_url = build_share_url(web_base_url, report.public_id)
    message = (
        f"Report {report.public_id} is now '{report.status.value}'. "
        f"Track latest timeline: {share_url}"
    )

    queued: list[NotificationDelivery] = []
    for subscription in subscriptions:
        channels = _channels_from_raw(subscription.channels)
        for channel in channels:
            delivery = NotificationDelivery(
                report_id=report.id,
                subscription_id=subscription.id,
                channel=channel,
                status=NotificationStatus.QUEUED,
                message=message,
            )

            if channel == NotificationChannel.EMAIL and subscription.email:
                sent = send_email_sendgrid(
                    to=[subscription.email],
                    cc=[],
                    subject=f"Report {report.public_id} status update",
                    body=message,
                )
                delivery.status = NotificationStatus.SENT if sent else NotificationStatus.FAILED
                delivery.sent_at = datetime.now(timezone.utc) if sent else None
                if not sent:
                    delivery.error_message = "email delivery not configured or failed"
            elif channel == NotificationChannel.EMAIL:
                delivery.status = NotificationStatus.FAILED
                delivery.error_message = "email channel selected but no email is subscribed"
            elif channel == NotificationChannel.WHATSAPP and subscription.whatsapp_number:
                sent = send_whatsapp(subscription.whatsapp_number, message)
                delivery.status = NotificationStatus.SENT if sent else NotificationStatus.FAILED
                delivery.sent_at = datetime.now(timezone.utc) if sent else None
                if not sent:
                    delivery.error_message = "whatsapp delivery not configured or failed"
            elif channel == NotificationChannel.WHATSAPP:
                delivery.status = NotificationStatus.FAILED
                delivery.error_message = "whatsapp channel selected but no phone is subscribed"

            db.add(delivery)
            db.flush()
            add_report_event(
                db,
                report_id=report.id,
                event_type="report.notification.queued",
                payload={"delivery_id": str(delivery.id), "channel": delivery.channel.value},
                actor=actor,
            )
            if delivery.status == NotificationStatus.SENT:
                add_report_event(
                    db,
                    report_id=report.id,
                    event_type="report.notification.sent",
                    payload={"delivery_id": str(delivery.id), "channel": delivery.channel.value},
                    actor=actor,
                )
            queued.append(delivery)

    return queued
