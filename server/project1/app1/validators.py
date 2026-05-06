"""
Production-level validators for file uploads and input data validation
"""
from django.core.exceptions import ValidationError
from django.conf import settings
from PIL import Image
import mimetypes

# ═════════════════════════════════════════════════════════════════════════════
# FILE UPLOAD VALIDATORS
# ═════════════════════════════════════════════════════════════════════════════

def validate_file_size(file, max_size_mb=5):
    """Validate file size doesn't exceed limit"""
    max_size = max_size_mb * 1024 * 1024  # Convert MB to bytes
    
    if file.size > max_size:
        raise ValidationError(
            f"File size {file.size / 1024 / 1024:.1f}MB exceeds maximum allowed size of {max_size_mb}MB"
        )


def validate_image_file(file):
    """Validate file is a valid image"""
    validate_file_size(file, max_size_mb=5)
    
    # Check file extension
    allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ext = file.name.split('.')[-1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"Image must be one of: {', '.join(allowed_extensions)}")
    
    # Verify it's actually an image
    try:
        img = Image.open(file)
        img.verify()
        file.seek(0)  # Reset file pointer
        
        # Check image dimensions aren't absurdly large (prevent memory attacks)
        img = Image.open(file)
        width, height = img.size
        if width > 10000 or height > 10000:
            raise ValidationError("Image dimensions are too large (max 10000x10000)")
        if width < 100 or height < 100:
            raise ValidationError("Image is too small (min 100x100)")
    except Exception as e:
        raise ValidationError(f"Invalid image file: {str(e)}")


def validate_pdf_file(file):
    """Validate file is a valid PDF"""
    validate_file_size(file, max_size_mb=10)
    
    # Check file extension
    if not file.name.lower().endswith('.pdf'):
        raise ValidationError("File must be in PDF format")
    
    # Check PDF magic bytes
    file.seek(0)
    header = file.read(4)
    if header != b'%PDF':
        raise ValidationError("File is not a valid PDF. Make sure you're uploading a real PDF file.")
    
    file.seek(0)  # Reset for processing


def validate_document_file(file):
    """Validate legal document (PDF, JPG, PNG)"""
    validate_file_size(file, max_size_mb=10)
    
    # Check file extension
    allowed_extensions = {'pdf', 'jpg', 'jpeg', 'png'}
    ext = file.name.split('.')[-1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"Document must be one of: {', '.join(allowed_extensions)}")
    
    # Validate based on type
    if ext == 'pdf':
        validate_pdf_file(file)
    else:
        validate_image_file(file)


# ═════════════════════════════════════════════════════════════════════════════
# PROPERTY INPUT VALIDATORS
# ═════════════════════════════════════════════════════════════════════════════

def validate_price(value):
    """Validate property price is reasonable"""
    if value <= 0:
        raise ValidationError("Price must be greater than 0")
    
    # Check for unreasonably high prices (e.g., more than 100 crore)
    max_price = 100 * 10000000  # 100 crore in INR
    if value > max_price:
        raise ValidationError(f"Price cannot exceed ₹{max_price:,}")


def validate_built_up_area(value):
    """Validate property area/size"""
    if value <= 0:
        raise ValidationError("Built-up area must be greater than 0")
    
    # Max 100,000 sq ft for any property
    if value > 100000:
        raise ValidationError("Built-up area cannot exceed 100,000 sq ft")
    
    # Min 100 sq ft for any property
    if value < 100:
        raise ValidationError("Built-up area must be at least 100 sq ft")


def validate_bathroom_count(value):
    """Validate number of bathrooms"""
    if value <= 0:
        raise ValidationError("Building must have at least 1 bathroom")
    
    if value > 50:
        raise ValidationError("Number of bathrooms cannot exceed 50")


def validate_description_length(value):
    """Validate property description"""
    if not value or len(value.strip()) < 10:
        raise ValidationError("Description must be at least 10 characters")
    
    if len(value) > 5000:
        raise ValidationError("Description cannot exceed 5000 characters")


def validate_property_place(value):
    """Validate property location/place"""
    if not value or len(value.strip()) < 3:
        raise ValidationError("Property location must be at least 3 characters")
    
    if len(value) > 100:
        raise ValidationError("Property location cannot exceed 100 characters")


def validate_coordinates(latitude, longitude):
    """Validate GPS coordinates"""
    if latitude is None or longitude is None:
        return  # Optional field
    
    if not (-90 <= latitude <= 90):
        raise ValidationError("Latitude must be between -90 and 90")
    
    if not (-180 <= longitude <= 180):
        raise ValidationError("Longitude must be between -180 and 180")


# ═════════════════════════════════════════════════════════════════════════════
# SELLER INPUT VALIDATORS
# ═════════════════════════════════════════════════════════════════════════════

def validate_phone_number(value):
    """Validate phone number format"""
    # Remove common formatting characters
    clean_phone = ''.join(c for c in value if c.isdigit())
    
    if len(clean_phone) < 10:
        raise ValidationError("Phone number must have at least 10 digits")
    
    if len(clean_phone) > 15:
        raise ValidationError("Phone number cannot exceed 15 digits")
    
    if not clean_phone.isdigit():
        raise ValidationError("Phone number must contain only digits and formatting characters")


def validate_address(value):
    """Validate address"""
    if not value or len(value.strip()) < 5:
        raise ValidationError("Address must be at least 5 characters")
    
    if len(value) > 500:
        raise ValidationError("Address cannot exceed 500 characters")


# ═════════════════════════════════════════════════════════════════════════════
# PAYMENT VALIDATORS
# ═════════════════════════════════════════════════════════════════════════════

def validate_booking_dates(check_in, check_out):
    """Validate booking dates"""
    from datetime import datetime, timedelta
    
    if check_in >= check_out:
        raise ValidationError("Check-out date must be after check-in date")
    
    # Minimum 1 day booking
    if (check_out - check_in).days < 1:
        raise ValidationError("Minimum booking period is 1 day")
    
    # Maximum 365 days booking
    if (check_out - check_in).days > 365:
        raise ValidationError("Maximum booking period is 365 days")
    
    # Can't book in the past
    if check_in < datetime.now().date():
        raise ValidationError("Cannot book for past dates")


def validate_booking_amount(amount):
    """Validate booking amount"""
    if amount <= 0:
        raise ValidationError("Booking amount must be greater than 0")
    
    if amount > 100000000:  # 1 crore max
        raise ValidationError("Booking amount exceeded maximum allowed")
