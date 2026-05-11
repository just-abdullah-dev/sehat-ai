import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """SMTP email delivery helpers."""

    @staticmethod
    def _validate_smtp_config() -> None:
        required_values = [
            settings.SMTP_HOST,
            settings.SMTP_FROM_EMAIL,
        ]
        if not all(value and str(value).strip() for value in required_values):
            raise RuntimeError(
                "SMTP is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL in backend environment."
            )

    @staticmethod
    def send_password_reset_otp(recipient_email: str, otp: str) -> None:
        EmailService._validate_smtp_config()

        subject = "Sehat AI Password Reset OTP"
        plain_body = (
            "You requested a password reset for your Sehat AI account.\n\n"
            f"Your one-time password (OTP) is: {otp}\n"
            "This code will expire in 15 minutes.\n\n"
            "If you did not request this, you can safely ignore this email."
        )
        html_body = f"""
        <html>
          <body>
            <p>You requested a password reset for your <strong>Sehat AI</strong> account.</p>
            <p style="font-size: 16px;">Your one-time password (OTP) is:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{otp}</p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          </body>
        </html>
        """

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = recipient_email
        message.set_content(plain_body)
        message.add_alternative(html_body, subtype="html")

        context = ssl.create_default_context()
        smtp_user = settings.SMTP_USERNAME or None
        smtp_password = settings.SMTP_PASSWORD or None

        try:
            if settings.SMTP_USE_SSL:
                with smtplib.SMTP_SSL(
                    host=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    context=context,
                    timeout=15,
                ) as server:
                    if smtp_user and smtp_password:
                        server.login(smtp_user, smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(
                    host=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    timeout=15,
                ) as server:
                    if settings.SMTP_USE_TLS:
                        server.starttls(context=context)
                    if smtp_user and smtp_password:
                        server.login(smtp_user, smtp_password)
                    server.send_message(message)
        except Exception:
            logger.exception("Failed to send password reset OTP email to %s", recipient_email)
            raise
