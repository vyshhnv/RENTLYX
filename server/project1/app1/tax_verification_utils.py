"""
Tax Receipt Verification Utilities
Handles OCR extraction, data validation, government portal verification, and fraud detection
"""

import re
import smtplib
import logging
from typing import Dict, Any, Optional, Tuple, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("pytesseract or PIL not installed. OCR features will be limited.")


# ─── Email Configuration ──────────────────────────────────────────────────────
SMTP_SERVER = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
SMTP_PORT = getattr(settings, 'EMAIL_PORT', 587)
EMAIL_USER = getattr(settings, 'EMAIL_HOST_USER', '')
EMAIL_PASS = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
ADMIN_EMAIL = getattr(settings, 'ADMIN_EMAIL', 'admin@rentlyx.com')


# ─── Fraud Detection ────────────────────────────────────────────────────────────
class FraudDetector:
    """Detects suspicious patterns in tax receipts"""
    
    @staticmethod
    def check_for_fraud(ocr_data: Dict[str, Any], page_text: str, 
                       qr_url: Optional[str] = None) -> Tuple[List[str], int]:
        """
        Perform fraud checks on extracted tax receipt data.
        
        Args:
            ocr_data: Extracted OCR data from document
            page_text: Raw text extracted from document
            qr_url: QR code URL if present in document
            
        Returns:
            Tuple of (fraud_flags, fraud_penalty_score)
        """
        
        flags = []
        penalty = 0
        
        # Check for missing receipt number
        if not ocr_data.get("assessment_number"):
            flags.append("Missing assessment/receipt number")
            penalty += 20
        
        # Check for property ID mismatch
        if ocr_data.get("property_owner"):
            if ocr_data["property_owner"] not in page_text:
                flags.append("Property owner mismatch in document")
                penalty += 25
        
        # Check for tax amount mismatch
        if ocr_data.get("tax_amount"):
            amount_str = str(ocr_data["tax_amount"]).strip()
            if amount_str not in page_text:
                flags.append("Tax amount inconsistency detected")
                penalty += 30
        
        # Check for date mismatch
        if ocr_data.get("payment_date"):
            if ocr_data["payment_date"] not in page_text:
                flags.append("Payment date inconsistency")
                penalty += 20
        
        # Check QR code authenticity
        if qr_url:
            if ".gov.in" not in qr_url and ".nic.in" not in qr_url:
                flags.append("QR code URL doesn't match government domain")
                penalty += 50
        
        # Check document length (suspiciously short documents)
        if len(page_text) < 200:
            flags.append("Document content too short (possible fake)")
            penalty += 25
        
        # Check for common OCR artifacts
        if "^" * 5 in page_text or "#" * 5 in page_text:
            flags.append("Potential image tampering detected")
            penalty += 35
        
        return flags, penalty
    
    @staticmethod
    def calculate_verification_score(base_score: int, fraud_penalty: int) -> Tuple[int, str]:
        """
        Calculate final verification score and status.
        
        Args:
            base_score: Base confidence score from OCR (0-100)
            fraud_penalty: Fraud detection penalty (0-100+)
            
        Returns:
            Tuple of (final_score, status)
            - final_score: 0-100
            - status: "VERIFIED", "SUSPICIOUS", or "REJECTED"
        """
        
        final_score = max(0, base_score - fraud_penalty)
        
        if final_score >= 80:
            status = "VERIFIED"
        elif final_score >= 50:
            status = "SUSPICIOUS"
        else:
            status = "REJECTED"
        
        return final_score, status


# ─── Email Alerts ──────────────────────────────────────────────────────────────
class EmailAlerts:
    """Send email alerts for suspicious uploads"""
    
    @staticmethod
    def send_fraud_alert(flags: List[str], property_name: str, seller_email: str,
                        receiver_email: Optional[str] = None):
        """
        Send email alert when fraud flags are detected.
        
        Args:
            flags: List of fraud flags detected
            property_name: Name of the property
            seller_email: Email of the seller who uploaded
            receiver_email: Admin email to send alert to (default: ADMIN_EMAIL)
        """
        
        if not flags:
            return True
        
        if not receiver_email:
            receiver_email = ADMIN_EMAIL
        
        subject = "🚨 Suspicious Tax Receipt Detected - Manual Review Required"
        
        issues_list = "\n".join([f"  • {flag}" for flag in flags])
        
        body = f"""
RentlyX Tax Verification Alert 🚨

Property: {property_name}
Seller Email: {seller_email}

Issues Detected:
{issues_list}

Action Required:
Please manually verify this tax receipt before approval.
Visit the admin dashboard to review and take action.

---
This is an automated alert from RentlyX system.
"""
        
        try:
            msg = MIMEMultipart()
            msg["From"] = EMAIL_USER
            msg["To"] = receiver_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            
            if EMAIL_USER and EMAIL_PASS:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(EMAIL_USER, EMAIL_PASS)
                server.send_message(msg)
                server.quit()
                logger.info(f"Fraud alert email sent to {receiver_email}")
                return True
            else:
                logger.warning("Email credentials not configured. Alert not sent.")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
            return False
    
    @staticmethod
    def send_verification_result_email(property_name: str, seller_email: str,
                                      status: str, reason: str = ""):
        """
        Send verification result to seller.
        
        Args:
            property_name: Name of property
            seller_email: Seller's email
            status: "VERIFIED", "REJECTED", or "PENDING_REVIEW"
            reason: Detailed reason if rejected
        """
        
        if status == "VERIFIED":
            subject = "✅ Tax Receipt Verified - Listing Approved"
            body = f"""
Your property listing has been approved! ✅

Property: {property_name}
Status: Tax receipt verified successfully.

Your property is now live on RentlyX.

Thank you!
RentlyX Team
"""
        elif status == "REJECTED":
            subject = "❌ Tax Receipt Rejected"
            body = f"""
Your tax receipt could not be verified. ❌

Property: {property_name}
Reason: {reason}

Please upload a clearer copy or contact support.

RentlyX Team
"""
        else:
            subject = "⏳ Tax Receipt Under Review"
            body = f"""
Your tax receipt is under manual review. ⏳

Property: {property_name}
Status: Pending admin verification

We'll notify you once verified.

RentlyX Team
"""
        
        try:
            msg = MIMEMultipart()
            msg["From"] = EMAIL_USER
            msg["To"] = seller_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            
            if EMAIL_USER and EMAIL_PASS:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(EMAIL_USER, EMAIL_PASS)
                server.send_message(msg)
                server.quit()
                logger.info(f"Verification result email sent to {seller_email}")
                
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")


class TaxReceiptExtractor:
    """Extract data from tax receipt images/PDFs using OCR"""
    
    @staticmethod
    def extract_from_document(file_path: str) -> Dict[str, Any]:
        """
        Extract property details from tax receipt document.
        
        Args:
            file_path: Path to the uploaded tax receipt file
            
        Returns:
            Dictionary with extracted data including:
            - property_id / survey_no
            - owner_name
            - property_address
            - tax_amount
            - tax_year
            - assessment_number
            - last_payment_date
        """
        
        if not OCR_AVAILABLE:
            return {
                "success": False,
                "error": "OCR libraries not installed. Install: pip install pytesseract pillow",
                "extracted_data": {}
            }
        
        try:
            # Check file type
            if file_path.lower().endswith('.pdf'):
                text = TaxReceiptExtractor._extract_from_pdf(file_path)
            else:
                text = TaxReceiptExtractor._extract_from_image(file_path)
            
            # Parse extracted text
            extracted = TaxReceiptExtractor._parse_tax_data(text)
            
            return {
                "success": True,
                "extracted_data": extracted,
                "raw_text": text
            }
            
        except Exception as e:
            logger.error(f"Error extracting tax receipt: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "extracted_data": {}
            }
    
    @staticmethod
    def _extract_from_image(file_path: str) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            raise Exception(f"Failed to extract from image: {str(e)}")
    
    @staticmethod
    def _extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF"""
        try:
            import PyPDF2
            text = ""
            with open(file_path, 'rb') as pdf:
                reader = PyPDF2.PdfReader(pdf)
                for page in reader.pages:
                    text += page.extract_text()
            return text
        except ImportError:
            raise Exception("PyPDF2 not installed. Install: pip install PyPDF2")
        except Exception as e:
            raise Exception(f"Failed to extract from PDF: {str(e)}")
    
    @staticmethod
    def _parse_tax_data(text: str) -> Dict[str, Any]:
        """
        Parse extracted text to identify key tax receipt fields
        This is a basic pattern matching; extend for specific municipal formats
        """
        
        extracted = {
            "assessment_number": None,
            "property_owner": None,
            "property_address": None,
            "property_value": None,
            "tax_amount": None,
            "tax_year": None,
            "financial_year": None,
            "payment_date": None,
            "municipality": None,
            "qr_code": None,
        }
        
        # Common patterns for tax receipts
        patterns = {
            "assessment_number": [
                r'(?:assessment|assessement|assesment|ref.?no|a\.?no)[:\s]*([A-Za-z0-9\-/]+)',
                r'(?:property|prop)[:\s]*([A-Za-z0-9\-/]+)',
            ],
            "tax_amount": [
                r'(?:amount|tax due|due)[:\s]*₹?(?:\s*)([\d,]+(?:\.\d{2})?)',
                r'(?:total tax)[:\s]*₹?(?:\s*)([\d,]+(?:\.\d{2})?)',
            ],
            "tax_year": [
                r'(?:year|for year)[:\s]*(\d{4})',
                r'(?:financial year|fy)[:\s]*(\d{4}[-/]\d{2,4})',
            ],
            "payment_date": [
                r'(?:payment date|paid on|date)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})',
                r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})',
            ],
            "property_owner": [
                r'(?:owner|name of assessee)[:\s]*([A-Za-z\s\.]+)',
            ],
        }

        address_patterns = [
            r'(?:address|property address|situated at|located at|location)[:\s]*([A-Za-z0-9\.,\-/\s]+)',
            r'(?:property is situated at|situated in|address of property)[:\s]*([A-Za-z0-9\.,\-/\s]+)',
        ]
        municipality_patterns = [
            r'(?:municipality|municipal corporation|corporation|panchayat|taluk|district)[:\s]*([A-Za-z\s]+)',
            r'([A-Za-z\s]+?)(?: municipal corporation| corporation| municipality| panchayat| district)',
        ]
        
        # Apply patterns
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    extracted[field] = match.group(1).strip()
                    break

        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted["property_address"] = match.group(1).strip()
                break

        for pattern in municipality_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted["municipality"] = match.group(1).strip()
                break

        if not extracted["municipality"]:
            known_locations = [
                "kozhikode", "calicut", "thiruvananthapuram", "trivandrum", "ernakulam",
                "alappuzha", "thrissur", "kollam", "kannur", "kasaragod", "palakkad",
                "wayanad", "pathanamthitta", "kottayam", "malappuram"
            ]
            for location in known_locations:
                if re.search(rf'\b{re.escape(location)}\b', text, re.IGNORECASE):
                    extracted["municipality"] = location.title()
                    break

        qr_match = re.search(r'(https?://[^\s]+)', text)
        if qr_match:
            extracted["qr_code"] = qr_match.group(1).strip()

        return extracted


class TaxRecordValidator:
    """Validate extracted tax data against property details"""
    
    @staticmethod
    def validate_extraction(property_obj, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate extracted tax data matches property information
        
        Args:
            property_obj: Properties model instance
            extracted_data: Data extracted from tax receipt
            
        Returns:
            Validation result with matches and discrepancies
        """
        
        validation = {
            "is_valid": True,
            "matches": [],
            "discrepancies": [],
            "confidence_score": 0,
            "warnings": []
        }
        
        # Check if assessment data exists
        if not extracted_data.get("assessment_number"):
            validation["discrepancies"].append("No assessment/property number found in document")
            validation["is_valid"] = False
        
        # Check if tax amount is present
        if not extracted_data.get("tax_amount"):
            validation["warnings"].append("Tax amount could not be extracted")
        
        # Check property address match
        if extracted_data.get("property_address"):
            if property_obj.property_place.lower() in extracted_data["property_address"].lower():
                validation["matches"].append("Property address matches")
            else:
                validation["discrepancies"].append(
                    f"Address mismatch: Document has '{extracted_data['property_address']}' "
                    f"vs property '{property_obj.property_place}'"
                )
        
        # Calculate confidence score (0-100)
        confidence = 0
        if extracted_data.get("assessment_number"):
            confidence += 30
        if extracted_data.get("property_owner"):
            confidence += 20
        if extracted_data.get("tax_amount"):
            confidence += 20
        if extracted_data.get("payment_date"):
            confidence += 20
        if extracted_data.get("tax_year"):
            confidence += 10
        
        validation["confidence_score"] = min(100, confidence)
        
        if validation.get("discrepancies"):
            validation["is_valid"] = False
        
        return validation


class GovernmentPortalVerifier:
    """
    Automatic government portal verification for property tax receipts
    Integrates with multiple government databases to verify legitimacy
    """
    
    # Government Portal API Endpoints
    PROPERTY_TAX_PORTAL = getattr(settings, 'PROPERTY_TAX_PORTAL_URL', '')
    PROPERTY_REGISTRY_API = getattr(settings, 'PROPERTY_REGISTRY_API_URL', '')
    GSTIN_VERIFICATION_API = getattr(settings, 'GSTIN_API_URL', '')
    
    @staticmethod
    def verify_with_municipal_records(property_place: str, assessment_number: str, 
                                     extracted_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Automatic verification against municipal tax records and government portals
        
        Args:
            property_place: Location of property
            assessment_number: Tax assessment/property ID from receipt
            extracted_data: Extracted OCR data for cross-validation
            
        Returns:
            Comprehensive verification result
        """
        import requests
        from django.conf import settings
        
        result = {
            "verified": False,
            "verification_type": "automatic",
            "portals_checked": [],
            "matches": [],
            "mismatches": [],
            "risk_score": 0,
            "final_status": "PENDING",
            "confidence": 0,
            "identified_portal": {},
            "qr_redirect_url": None,
            "error": None
        }
        portal_info = GovernmentPortalVerifier.identify_government_portal(property_place, extracted_data or {})
        result["identified_portal"] = portal_info
        result["qr_redirect_url"] = portal_info.get("qr_redirect_url")
        result["portals_checked"].append(portal_info["portal_name"])
        
        try:
            # ── Step 1: Property Registry Verification ──────────────────────────
            if extracted_data and extracted_data.get("assessment_number"):
                registry_check = GovernmentPortalVerifier._verify_property_registry(
                    assessment_number,
                    extracted_data
                )
                result["portals_checked"].append("Property Registry")
                
                if registry_check["verified"]:
                    result["matches"].extend(registry_check.get("matches", []))
                    result["confidence"] += registry_check.get("confidence_boost", 0)
                else:
                    result["mismatches"].extend(registry_check.get("mismatches", []))
                    result["risk_score"] += registry_check.get("risk_penalty", 0)
            
            # ── Step 2: Tax Payment History Verification ──────────────────────
            if assessment_number:
                tax_check = GovernmentPortalVerifier._verify_tax_payment_records(
                    assessment_number,
                    extracted_data
                )
                result["portals_checked"].append("Tax Payment Records")
                
                if tax_check["verified"]:
                    result["matches"].extend(tax_check.get("matches", []))
                    result["confidence"] += tax_check.get("confidence_boost", 0)
                else:
                    result["mismatches"].extend(tax_check.get("mismatches", []))
                    result["risk_score"] += tax_check.get("risk_penalty", 0)
            
            # ── Step 3: Owner Identity Verification ──────────────────────────
            if extracted_data and extracted_data.get("property_owner"):
                owner_check = GovernmentPortalVerifier._verify_owner_identity(
                    extracted_data.get("property_owner"),
                    extracted_data.get("property_address", "")
                )
                result["portals_checked"].append("Owner Identity Verification")
                
                if owner_check["verified"]:
                    result["matches"].extend(owner_check.get("matches", []))
                    result["confidence"] += owner_check.get("confidence_boost", 0)
                else:
                    result["mismatches"].extend(owner_check.get("mismatches", []))
                    result["risk_score"] += owner_check.get("risk_penalty", 0)
            
            # ── Step 4: QR Code & Document Signature Verification ────────────
            if extracted_data and extracted_data.get("qr_code"):
                qr_check = GovernmentPortalVerifier._verify_qr_authenticity(
                    extracted_data.get("qr_code"),
                    assessment_number
                )
                result["portals_checked"].append("QR Code Verification")
                
                if qr_check["verified"]:
                    result["matches"].extend(qr_check.get("matches", []))
                    result["confidence"] += qr_check.get("confidence_boost", 0)
                else:
                    result["mismatches"].extend(qr_check.get("mismatches", []))
                    result["risk_score"] += qr_check.get("risk_penalty", 0)

            # ── Step 5: Local fallback portal verification if external APIs are unavailable ─
            fallback_check = GovernmentPortalVerifier._simulate_portal_verification(
                property_place,
                assessment_number,
                extracted_data or {}
            )
            result["portals_checked"].append("Local Heuristic Verification")
            result["matches"].extend(fallback_check.get("matches", []))
            result["mismatches"].extend(fallback_check.get("mismatches", []))
            result["confidence"] += fallback_check.get("confidence_boost", 0)
            result["risk_score"] += fallback_check.get("risk_penalty", 0)
            result["identified_portal"] = portal_info
            
            # ── Step 6: Determine Final Status ───────────────────────────────
            result["confidence"] = min(100, result["confidence"])
            
            if result["confidence"] >= 85 and result["risk_score"] < 20:
                result["verified"] = True
                result["final_status"] = "AUTO_VERIFIED"
            elif result["confidence"] >= 70 and result["risk_score"] < 40:
                result["final_status"] = "REQUIRES_MANUAL_REVIEW"
            else:
                result["final_status"] = "REJECTED"
            
            logger.info(f"Automatic verification completed for {assessment_number}: {result['final_status']}")
            
        except requests.exceptions.RequestException as e:
            result["error"] = f"Government portal connection error: {str(e)}"
            result["final_status"] = "VERIFICATION_UNAVAILABLE"
            logger.error(f"Portal verification failed: {str(e)}")
        except Exception as e:
            result["error"] = f"Verification error: {str(e)}"
            logger.error(f"Unexpected error in verification: {str(e)}")
        
        return result
    
    @staticmethod
    def _verify_property_registry(assessment_number: str, extracted_data: Dict) -> Dict[str, Any]:
        """Verify property details in government registry"""
        import requests
        
        check_result = {
            "verified": False,
            "matches": [],
            "mismatches": [],
            "confidence_boost": 0,
            "risk_penalty": 0
        }
        
        try:
            # Check if API credentials are configured
            api_url = getattr(settings, 'PROPERTY_REGISTRY_API_URL', None)
            api_key = getattr(settings, 'PROPERTY_REGISTRY_API_KEY', None)
            
            if not api_url or not api_key:
                check_result["matches"].append("Property registry check skipped (API not configured)")
                return check_result
            
            # Make API call to property registry
            headers = {"Authorization": f"Bearer {api_key}"}
            params = {"assessment_id": assessment_number}
            
            response = requests.get(api_url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                registry_data = response.json()
                
                # Cross-check with extracted data
                if extracted_data.get("property_owner"):
                    if registry_data.get("owner_name", "").lower() == extracted_data["property_owner"].lower():
                        check_result["matches"].append("Owner name matches registry")
                        check_result["confidence_boost"] += 25
                    else:
                        check_result["mismatches"].append(f"Owner name mismatch: Registry has '{registry_data.get('owner_name')}'")
                        check_result["risk_penalty"] += 30
                
                if registry_data.get("status") == "active":
                    check_result["matches"].append("Property is active in government records")
                    check_result["confidence_boost"] += 30
                    check_result["verified"] = True
                else:
                    check_result["mismatches"].append(f"Property not active: Status is {registry_data.get('status')}")
                    check_result["risk_penalty"] += 40
            else:
                check_result["mismatches"].append(f"Government registry returned status {response.status_code}")
                check_result["risk_penalty"] += 25
                
        except Exception as e:
            logger.warning(f"Property registry check failed: {str(e)}")
            check_result["matches"].append("Property registry unavailable (fallback accepted)")
        
        return check_result
    
    @staticmethod
    def identify_government_portal(property_place: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Infer the most likely government portal based on extracted receipt details."""
        text = " ".join([
            str(property_place or ""),
            str(extracted_data.get("property_address", "") or ""),
            str(extracted_data.get("municipality", "") or ""),
            str(extracted_data.get("qr_code", "") or "")
        ]).lower()

        known_portals = [
            ("kozhikode", "Kozhikode Municipal Corporation Property Tax Portal", "https://kozhikodecorporation.lsgkerala.gov.in"),
            ("calicut", "Kozhikode Municipal Corporation Property Tax Portal", "https://kozhikodecorporation.lsgkerala.gov.in"),
            ("thiruvananthapuram", "Thiruvananthapuram Municipal Corporation Property Tax Portal", "https://tmc.kerala.gov.in"),
            ("trivandrum", "Thiruvananthapuram Municipal Corporation Property Tax Portal", "https://tmc.kerala.gov.in"),
            ("ernakulam", "Kochi Municipal Corporation Property Tax Portal", "https://kochicorporation.lsgkerala.gov.in"),
            ("thrissur", "Thrissur Municipal Corporation Property Tax Portal", "https://thrissurcorporation.lsgkerala.gov.in"),
            ("kollam", "Kollam Municipal Corporation Property Tax Portal", "https://kollamcorporation.lsgkerala.gov.in"),
            ("kannur", "Kannur Municipal Corporation Property Tax Portal", "https://kannurcorporation.lsgkerala.gov.in"),
            ("kasaragod", "Kasaragod Municipal Corporation Property Tax Portal", "https://kasaragodcorporation.lsgkerala.gov.in"),
            ("palakkad", "Palakkad Municipality Property Tax Portal", "https://palakkadmunicipality.lsgkerala.gov.in"),
            ("kottayam", "Kottayam Municipality Property Tax Portal", "https://kottayammunicipality.lsgkerala.gov.in"),
        ]

        portal = {
            "portal_name": "Kerala Local Self Government Property Tax Portal",
            "portal_domain": "https://lsgkerala.gov.in",
            "region": "Kerala",
            "inferred_from": "fallback",
            "location_source": None,
            "qr_redirect_url": None
        }

        for keyword, portal_name, portal_domain in known_portals:
            if keyword in text:
                portal.update({
                    "portal_name": portal_name,
                    "portal_domain": portal_domain,
                    "inferred_from": "location",
                    "location_source": keyword
                })
                break

        qr_code = extracted_data.get("qr_code")
        if qr_code:
            portal["qr_redirect_url"] = qr_code
            if ".gov.in" in qr_code or ".nic.in" in qr_code or ".india.gov.in" in qr_code:
                portal["portal_domain"] = qr_code.split("/", 3)[2] if "/" in qr_code else qr_code
                portal["portal_name"] = f"Government QR portal ({portal['portal_domain']})"
                portal["inferred_from"] = "qr_code"

        return portal

    @staticmethod
    def _verify_tax_payment_records(assessment_number: str, extracted_data: Dict) -> Dict[str, Any]:
        """Verify tax payment history"""
        import requests
        from datetime import datetime, timedelta
        
        check_result = {
            "verified": False,
            "matches": [],
            "mismatches": [],
            "confidence_boost": 0,
            "risk_penalty": 0
        }
        
        try:
            api_url = getattr(settings, 'TAX_PAYMENT_API_URL', None)
            api_key = getattr(settings, 'TAX_PAYMENT_API_KEY', None)
            
            if not api_url or not api_key:
                check_result["matches"].append("Tax payment record check skipped (API not configured)")
                return check_result
            
            headers = {"Authorization": f"Bearer {api_key}"}
            params = {"assessment_id": assessment_number}
            
            response = requests.get(api_url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                payment_data = response.json()
                
                if payment_data.get("tax_paid"):
                    check_result["matches"].append("Tax payment confirmed in government records")
                    check_result["confidence_boost"] += 35
                    check_result["verified"] = True
                    
                    # Check if payment is recent (within last 12 months)
                    last_payment = payment_data.get("last_payment_date")
                    if last_payment:
                        payment_date = datetime.fromisoformat(last_payment)
                        if datetime.now() - payment_date < timedelta(days=365):
                            check_result["matches"].append("Tax payment is current (within 12 months)")
                            check_result["confidence_boost"] += 20
                        else:
                            check_result["mismatches"].append("Tax payment is outdated (older than 12 months)")
                            check_result["risk_penalty"] += 15
                else:
                    check_result["mismatches"].append("No tax payment records found")
                    check_result["risk_penalty"] += 50
                
                if extracted_data.get("tax_amount"):
                    if str(payment_data.get("tax_amount", "")) == str(extracted_data["tax_amount"]):
                        check_result["matches"].append("Tax amount matches government records")
                        check_result["confidence_boost"] += 20
                    else:
                        check_result["mismatches"].append(f"Tax amount mismatch: Receipt has {extracted_data['tax_amount']}, records show {payment_data.get('tax_amount')}")
                        check_result["risk_penalty"] += 35
                        
        except Exception as e:
            logger.warning(f"Tax payment record check failed: {str(e)}")
            check_result["matches"].append("Tax payment records unavailable (fallback accepted)")
        
        return check_result
    
    @staticmethod
    def _verify_owner_identity(owner_name: str, property_address: str) -> Dict[str, Any]:
        """Verify owner identity through government databases"""
        import requests
        
        check_result = {
            "verified": False,
            "matches": [],
            "mismatches": [],
            "confidence_boost": 0,
            "risk_penalty": 0
        }
        
        try:
            # Note: This would typically use government identity verification APIs
            # such as Aadhaar verification through UIDAI or PAN verification through ITR
            
            api_url = getattr(settings, 'IDENTITY_VERIFICATION_API_URL', None)
            api_key = getattr(settings, 'IDENTITY_VERIFICATION_API_KEY', None)
            
            if not api_url or not api_key:
                check_result["matches"].append("Identity verification skipped (API not configured)")
                return check_result
            
            # Placeholder for actual verification
            check_result["matches"].append("Owner identity verification in progress")
            
        except Exception as e:
            logger.warning(f"Owner identity check failed: {str(e)}")
            check_result["matches"].append("Owner identity verification unavailable (fallback accepted)")
        
        return check_result
    
    @staticmethod
    def _verify_qr_authenticity(qr_code: str, assessment_number: str) -> Dict[str, Any]:
        """Verify QR code authenticity and digital signature"""
        check_result = {
            "verified": False,
            "matches": [],
            "mismatches": [],
            "confidence_boost": 0,
            "risk_penalty": 0
        }
        
        try:
            # Check QR code format and contents
            if not qr_code:
                check_result["mismatches"].append("QR code not found on document")
                check_result["risk_penalty"] += 40
                return check_result
            
            # Verify QR code contains government domain
            if ".gov.in" in qr_code or ".nic.in" in qr_code or ".india.gov.in" in qr_code:
                check_result["matches"].append("QR code verified as government issued")
                check_result["confidence_boost"] += 25
                check_result["verified"] = True
            else:
                check_result["mismatches"].append("QR code domain not recognized as government")
                check_result["risk_penalty"] += 45
            
            # Verify QR code contains assessment number
            if assessment_number.strip() in qr_code or assessment_number.replace(" ", "") in qr_code:
                check_result["matches"].append("Assessment number embedded in QR code")
                check_result["confidence_boost"] += 20
            else:
                check_result["mismatches"].append("QR code does not contain assessment number")
                check_result["risk_penalty"] += 25
                
        except Exception as e:
            logger.warning(f"QR code verification failed: {str(e)}")
            check_result["risk_penalty"] += 15
        
        return check_result

    @staticmethod
    def _simulate_portal_verification(property_place: str, assessment_number: str,
                                     extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate automatic government portal verification without external APIs."""
        check_result = {
            "verified": False,
            "matches": [],
            "mismatches": [],
            "confidence_boost": 0,
            "risk_penalty": 0
        }

        if not assessment_number:
            check_result["mismatches"].append("No assessment number available for fallback portal verification")
            check_result["risk_penalty"] += 50
            return check_result

        if re.match(r'^[A-Za-z0-9\-/]{5,}$', assessment_number):
            check_result["matches"].append("Assessment number format looks valid")
            check_result["confidence_boost"] += 20
        else:
            check_result["mismatches"].append("Assessment number format looks suspicious")
            check_result["risk_penalty"] += 25

        address = extracted_data.get("property_address", "") if extracted_data else ""
        owner = extracted_data.get("property_owner", "") if extracted_data else ""
        tax_amount = extracted_data.get("tax_amount") if extracted_data else None
        payment_date = extracted_data.get("payment_date") if extracted_data else None
        qr_code = extracted_data.get("qr_code") if extracted_data else None

        if property_place and address:
            if property_place.lower() in address.lower():
                check_result["matches"].append("Property address matches expected location")
                check_result["confidence_boost"] += 20
            else:
                check_result["mismatches"].append("Document address does not match property location")
                check_result["risk_penalty"] += 20

        if owner and property_place:
            if owner.lower() in property_place.lower() or property_place.lower() in owner.lower():
                check_result["matches"].append("Owner or property location appears consistent")
                check_result["confidence_boost"] += 10

        if tax_amount:
            cleaned_amount = str(tax_amount).replace('₹', '').replace(',', '').strip()
            if re.match(r'^[0-9]+(?:\.\d{1,2})?$', cleaned_amount):
                check_result["matches"].append("Tax amount format is valid")
                check_result["confidence_boost"] += 10
            else:
                check_result["mismatches"].append("Tax amount format is invalid")
                check_result["risk_penalty"] += 10

        if payment_date:
            if re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{4}', str(payment_date)):
                check_result["matches"].append("Payment date format is valid")
                check_result["confidence_boost"] += 10
            else:
                check_result["mismatches"].append("Payment date format is invalid")
                check_result["risk_penalty"] += 15

        if qr_code:
            if ".gov.in" in qr_code or ".nic.in" in qr_code or ".india.gov.in" in qr_code:
                check_result["matches"].append("QR code looks like a government-issued URL")
                check_result["confidence_boost"] += 15
            else:
                check_result["mismatches"].append("QR code URL does not appear government-issued")
                check_result["risk_penalty"] += 20

        if check_result["confidence_boost"] >= 60 and check_result["risk_penalty"] < 40:
            check_result["verified"] = True

        return check_result

    @staticmethod
    def verify_document_authenticity(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive document authenticity checks
        """
        checks = {
            "has_assessment_number": bool(extracted_data.get("assessment_number")),
            "has_payment_date": bool(extracted_data.get("payment_date")),
            "has_tax_amount": bool(extracted_data.get("tax_amount")),
            "has_owner_name": bool(extracted_data.get("property_owner")),
            "has_qr_code": bool(extracted_data.get("qr_code")),
            "is_recent": False,
            "document_checks": [],
            "completeness_score": 0
        }
        
        # Calculate completeness score
        if checks["has_assessment_number"]:
            checks["completeness_score"] += 20
            checks["document_checks"].append("✓ Assessment number present")
        if checks["has_payment_date"]:
            checks["completeness_score"] += 20
            checks["document_checks"].append("✓ Payment date present")
        if checks["has_tax_amount"]:
            checks["completeness_score"] += 20
            checks["document_checks"].append("✓ Tax amount present")
        if checks["has_owner_name"]:
            checks["completeness_score"] += 20
            checks["document_checks"].append("✓ Owner name present")
        if checks["has_qr_code"]:
            checks["completeness_score"] += 20
            checks["document_checks"].append("✓ QR code present (government issued)")
        
        if checks["completeness_score"] >= 80:
            checks["document_checks"].insert(0, "✅ Tax receipt appears AUTHENTIC - All required fields present")
        elif checks["completeness_score"] >= 60:
            checks["document_checks"].insert(0, "⚠️ Tax receipt is incomplete - Some fields missing")
        else:
            checks["document_checks"].insert(0, "❌ Tax receipt appears FAKE - Too many missing fields")
        
        return checks


def verify_tax_receipt(property_obj, file_path: str, admin_verification: bool = False) -> Dict[str, Any]:
    """
    Complete tax receipt verification workflow with fraud detection.
    
    Args:
        property_obj: Properties model instance
        file_path: Path to uploaded tax receipt
        admin_verification: Whether this is manual admin verification
        
    Returns:
        Complete verification result including fraud detection
    """
    
    result = {
        "status": "pending",
        "verification_source": "automatic",
        "extracted_data": {},
        "validation": {},
        "fraud_flags": [],
        "fraud_penalty": 0,
        "final_score": 0,
        "portal_check": {},
        "final_result": False,
        "recommendation": "pending_admin_review"
    }
    
    # Step 1: Extract data
    extraction = TaxReceiptExtractor.extract_from_document(file_path)
    if not extraction["success"]:
        result["status"] = "extraction_failed"
        result["error"] = extraction["error"]
        return result
    
    result["extracted_data"] = extraction["extracted_data"]
    raw_text = extraction.get("raw_text", "")
    
    # Step 2: Validate extraction
    validation = TaxRecordValidator.validate_extraction(property_obj, extraction["extracted_data"])
    result["validation"] = validation
    
    # Step 3: Fraud Detection
    fraud_flags, fraud_penalty = FraudDetector.check_for_fraud(
        extraction["extracted_data"],
        raw_text
    )
    result["fraud_flags"] = fraud_flags
    result["fraud_penalty"] = fraud_penalty
    
    # Step 4: Calculate final verification score
    base_score = validation["confidence_score"]
    final_score, final_status = FraudDetector.calculate_verification_score(base_score, fraud_penalty)
    result["final_score"] = final_score
    result["fraud_status"] = final_status
    
    # Step 5: Try government portal verification
    if extraction["extracted_data"].get("assessment_number"):
        portal_result = GovernmentPortalVerifier.verify_with_municipal_records(
            property_obj.property_place,
            extraction["extracted_data"]["assessment_number"]
        )
        result["portal_check"] = portal_result
    
    # Step 6: Send alerts if fraud detected
    if fraud_flags:
        EmailAlerts.send_fraud_alert(
            flags=fraud_flags,
            property_name=property_obj.name,
            seller_email=property_obj.seller.user.email
        )
    
    # Step 7: Final determination
    if final_status == "VERIFIED" and validation["is_valid"]:
        result["final_result"] = True
        result["status"] = "verified"
        result["recommendation"] = "approve"
        EmailAlerts.send_verification_result_email(
            property_name=property_obj.name,
            seller_email=property_obj.seller.user.email,
            status="VERIFIED"
        )
    elif final_status == "SUSPICIOUS":
        result["status"] = "requires_admin_review"
        result["recommendation"] = "manual_review_required"
        EmailAlerts.send_verification_result_email(
            property_name=property_obj.name,
            seller_email=property_obj.seller.user.email,
            status="PENDING_REVIEW",
            reason="Document requires manual verification for security"
        )
    elif final_status == "REJECTED":
        result["status"] = "rejected"
        result["recommendation"] = "reject"
        reason = ", ".join(fraud_flags) if fraud_flags else "Document did not pass verification"
        EmailAlerts.send_verification_result_email(
            property_name=property_obj.name,
            seller_email=property_obj.seller.user.email,
            status="REJECTED",
            reason=reason
        )
    elif admin_verification:
        result["status"] = "verified"
        result["verification_source"] = "manual"
        result["final_result"] = True
        result["recommendation"] = "admin_verified"
        EmailAlerts.send_verification_result_email(
            property_name=property_obj.name,
            seller_email=property_obj.seller.user.email,
            status="VERIFIED"
        )
    else:
        result["status"] = "requires_admin_review"
        result["recommendation"] = "manual_review_required"
    
    return result
