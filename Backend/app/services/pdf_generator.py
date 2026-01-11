from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
from pathlib import Path
from app.models.scan import ScanHistory
from app.core.config import settings
import os


class PDFGenerator:
    """Service for generating PDF reports"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        # Header style
        self.header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#34495E'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )

        # Normal style
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=6
        )

    def generate_report(self, scan: ScanHistory, language: str = "en") -> str:
        """
        Generate PDF report for a scan.

        Args:
            scan: Scan history record
            language: Report language ('en' for English, 'ur' for Urdu)

        Returns:
            Path to generated PDF file

        Raises:
            Exception: If PDF generation fails
        """
        try:
            # Create reports directory if it doesn't exist
            reports_dir = Path(settings.REPORT_DIR)
            reports_dir.mkdir(parents=True, exist_ok=True)

            # Generate PDF filename
            pdf_filename = f"report_{scan.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = reports_dir / pdf_filename

            # Create PDF document
            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )

            # Build content
            content = []

            # Add title
            title_text = "SehatAI Medical Report" if language == "en" else "SehatAI طبی رپورٹ"
            content.append(Paragraph(title_text, self.title_style))
            content.append(Spacer(1, 0.3 * inch))

            # Add scan details table
            scan_data = self._build_scan_data(scan, language)
            scan_table = Table(scan_data, colWidths=[2.5 * inch, 3.5 * inch])
            scan_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            content.append(scan_table)
            content.append(Spacer(1, 0.3 * inch))

            # Add X-ray image if available
            if os.path.exists(scan.file_url):
                content.append(Paragraph("X-Ray Image:" if language == "en" else "ایکس رے تصویر:", self.header_style))
                content.append(Spacer(1, 0.1 * inch))

                img = Image(scan.file_url, width=4 * inch, height=4 * inch)
                content.append(img)
                content.append(Spacer(1, 0.2 * inch))

            # Add disclaimer
            disclaimer = self._get_disclaimer(language)
            content.append(Paragraph(disclaimer, self.normal_style))

            # Build PDF
            doc.build(content)

            return str(pdf_path)

        except Exception as e:
            raise Exception(f"Failed to generate PDF report: {str(e)}")

    def _build_scan_data(self, scan: ScanHistory, language: str) -> list:
        """Build scan data for table"""
        if language == "en":
            return [
                ["Report ID:", f"#{scan.id}"],
                ["Date & Time:", scan.created_at.strftime("%Y-%m-%d %H:%M:%S")],
                ["Model Used:", scan.model_used.value.upper()],
                ["Result:", scan.result.value],
                ["Confidence:", f"{scan.confidence:.2%}"],
                ["Processing Time:", f"{scan.processing_time:.2f} seconds"],
            ]
        else:
            # Urdu labels (right-to-left text support may require additional configuration)
            return [
                ["رپورٹ نمبر:", f"#{scan.id}"],
                ["تاریخ اور وقت:", scan.created_at.strftime("%Y-%m-%d %H:%M:%S")],
                ["ماڈل:", scan.model_used.value.upper()],
                ["نتیجہ:", scan.result.value],
                ["اعتماد:", f"{scan.confidence:.2%}"],
                ["پروسیسنگ ٹائم:", f"{scan.processing_time:.2f} seconds"],
            ]

    def _get_disclaimer(self, language: str) -> str:
        """Get disclaimer text based on language"""
        if language == "en":
            return (
                "<b>Disclaimer:</b> This report is generated using AI-based medical image analysis. "
                "The results should be reviewed by a qualified healthcare professional. "
                "This is not a substitute for professional medical advice, diagnosis, or treatment."
            )
        else:
            return (
                "<b>دستبرداری:</b> یہ رپورٹ AI پر مبنی طبی تصویری تجزیہ استعمال کرتے ہوئے تیار کی گئی ہے۔ "
                "نتائج کا جائزہ کسی تصدیق شدہ صحت کی دیکھ بھال کرنے والے پیشہ ور کے ذریعے لیا جانا چاہیے۔"
            )


# Global PDF generator instance
pdf_generator = PDFGenerator()
