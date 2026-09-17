"""SMTP email alert dispatcher with HTML rendering and TLS support."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from packages.alerting.dispatchers.base import BaseDispatcher
from packages.core.models.alert import Alert

logger = logging.getLogger(__name__)


class EmailDispatcher(BaseDispatcher):
    """Dispatches alerts to recipients via SMTP email."""

    def __init__(
        self,
        smtp_host: str = "localhost",
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        from_email: str = "alerts@mlite.local",
        recipients: Optional[List[str]] = None,
        use_tls: bool = True,
    ) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email
        self.recipients = recipients or []
        self.use_tls = use_tls

    def _send_sync(self, alert: Alert) -> bool:
        """Synchronous SMTP email delivery."""
        if not self.recipients:
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{alert.severity.value}] MLite Alert: {alert.title}"
        msg["From"] = self.from_email
        msg["To"] = ", ".join(self.recipients)

        text_body = f"{alert.title}\n\nSeverity: {alert.severity.value}\nEvent: {alert.event_type}\n\n{alert.message}"
        html_body = f"""<html>
<body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px;">
  <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px;">
    <h2 style="color: #38bdf8; margin-top: 0;">[{alert.severity.value}] {alert.title}</h2>
    <p><strong>Event:</strong> {alert.event_type}</p>
    <p><strong>Model:</strong> {alert.model_name or 'N/A'}</p>
    <p style="background: #0f172a; padding: 12px; border-radius: 6px; font-family: monospace;">{alert.message}</p>
    <p style="color: #64748b; font-size: 12px;">Delivered by MLite Alert Engine</p>
  </div>
</body>
</html>"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=5.0) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, self.recipients, msg.as_string())
            return True
        except Exception as exc:
            logger.warning("Email dispatch failed: %s", exc)
            return False

    async def dispatch(self, alert: Alert) -> bool:
        """Asynchronously dispatch email via executor."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._send_sync, alert)
