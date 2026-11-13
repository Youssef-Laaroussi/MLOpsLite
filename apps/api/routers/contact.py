"""Deliver public contact form submissions to a configured maintainer inbox."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, StringConstraints

from apps.api.config import Settings, get_settings

router = APIRouter(prefix="/api/v1", tags=["Contact"])
logger = logging.getLogger(__name__)


class ContactSubmission(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] = ""
    email: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True, max_length=254,
            pattern=r"^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$",
        ),
    ]
    topic: Literal["feedback", "selfhosted", "bug", "contribute", "enterprise"]
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


@router.post("/contact", status_code=204)
def submit_contact(
    submission: ContactSubmission,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    if not (settings.contact_smtp_host and settings.contact_from_email and settings.contact_to_email):
        raise HTTPException(503, "Contact delivery is unavailable.")

    message = EmailMessage()
    message["Subject"] = f"MLite contact: {submission.topic}"
    message["From"] = settings.contact_from_email
    message["To"] = settings.contact_to_email
    message["Reply-To"] = submission.email
    message.set_content(
        f"Name: {submission.name or 'Not provided'}\n"
        f"Email: {submission.email}\n\n{submission.message}"
    )

    try:
        with smtplib.SMTP(settings.contact_smtp_host, settings.contact_smtp_port, timeout=5) as smtp:
            if settings.contact_smtp_starttls:
                smtp.starttls(context=ssl.create_default_context())
            if settings.contact_smtp_user:
                password = settings.contact_smtp_password
                smtp.login(settings.contact_smtp_user, password.get_secret_value() if password else "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.warning("Contact delivery failed (%s)", type(exc).__name__)
        raise HTTPException(503, "Could not send your message. Please try again.") from exc

    return Response(status_code=204)
