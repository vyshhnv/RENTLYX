from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.core.validators import FileExtensionValidator

class Seller(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    is_verified = models.BooleanField(default=False)
    pan_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


class Properties(models.Model):

    PURPOSE_CHOICES = [
        ('rent', 'For Rent'),
        ('sale', 'For Sale'),
    ]

    PROPERTY_TYPE_CHOICES = [
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('villa', 'Villa'),
        ('flat', 'Flat'),
    ]

    BHK_CHOICES = [
        ('1bhk', '1 BHK'),
        ('2bhk', '2 BHK'),
        ('3bhk', '3 BHK'),
        ('4bhk+', '4+ BHK / More'),
    ]

    FURNISHING_CHOICES = [
        ('full', 'Fully Furnished'),
        ('semi', 'Semi Furnished'),
        ('unfurnished', 'Unfurnished'),
    ]

    # ── NEW: listing approval status ─────────────────────────────────────────
    LISTING_STATUS_CHOICES = [
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    seller = models.ForeignKey('Seller', on_delete=models.CASCADE, related_name='properties')

    purpose       = models.CharField(max_length=10, choices=PURPOSE_CHOICES, default='sale')
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES, default='apartment')

    property_place = models.CharField(max_length=100)
    city           = models.CharField(max_length=100, default='Kozhikode')
    name           = models.CharField(max_length=100)
    price          = models.DecimalField(max_digits=10, decimal_places=2)
    bhk            = models.CharField(max_length=10, choices=BHK_CHOICES, default='1bhk')
    bathrooms      = models.PositiveIntegerField(default=1)
    built_up_area  = models.DecimalField(max_digits=10, decimal_places=2, help_text="in sq. ft.")
    furnishing     = models.CharField(max_length=20, choices=FURNISHING_CHOICES, default='unfurnished')
    availability_date = models.DateField(null=True, blank=True)

    # Cover / main image
    property_image = models.ImageField(upload_to="properties/", blank=True, null=True)

    conditions_pdf = models.FileField(
        upload_to="conditions/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
        help_text="Upload terms & conditions PDF"
    )

    # ── NEW: legal supporting document (tax receipt, ownership proof, etc.) ──
    legal_document = models.FileField(
        upload_to="legal_docs/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])],
        help_text="Upload supporting legal document (tax receipt, ownership proof, etc.)"
    )

    # ── NEW: admin approval status ────────────────────────────────────────────
    listing_status       = models.CharField(
        max_length=10,
        choices=LISTING_STATUS_CHOICES,
        default='pending',
        help_text="Admin must approve before listing is visible"
    )
    admin_rejection_note = models.TextField(
        blank=True,
        null=True,
        help_text="Optional note from admin when rejecting a listing"
    )

    description = models.TextField()
    latitude    = models.FloatField(null=True, blank=True)
    longitude   = models.FloatField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Properties"
        # Production indexes for performance
        indexes = [
            models.Index(fields=['listing_status', '-created_at']),
            models.Index(fields=['seller', 'listing_status']),
            models.Index(fields=['city', 'property_type', 'listing_status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['price']),
        ]


# ─── Gallery images ───────────────────────────────────────────────────────────
class PropertyImage(models.Model):
    property    = models.ForeignKey(
        Properties,
        on_delete=models.CASCADE,
        related_name='extra_images'
    )
    image       = models.ImageField(upload_to='properties/gallery/')
    caption     = models.CharField(max_length=100, blank=True)
    order       = models.PositiveSmallIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']
        indexes = [
            models.Index(fields=['property', 'order']),
            models.Index(fields=['uploaded_at']),
        ]

    def __str__(self):
        return f"Image for {self.property.name} (#{self.id})"


# ─── OTP models ───────────────────────────────────────────────────────────────
class EmailOTP(models.Model):
    email       = models.EmailField(unique=True)
    otp         = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)

    def __str__(self):
        return self.email


class SellerEmailOTP(models.Model):
    email       = models.EmailField(unique=True)
    otp         = models.CharField(max_length=6)
    created_at  = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def __str__(self):
        return f"{self.email} - {self.otp}"


class SellerPhoneOTP(models.Model):
    phone      = models.CharField(max_length=15)
    otp        = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def __str__(self):
        return f"{self.phone} - {self.otp}"


COMPLAINT_TYPE_CHOICES = [
    ('incorrect_listing',   'Incorrect listing details'),
    ('fraudulent_property', 'Fraudulent property'),
    ('agent_misconduct',    'Agent misconduct'),
    ('payment_issue',       'Payment issue'),
    ('technical_bug',       'Technical / app bug'),
    ('other',               'Other'),
]

COMPLAINT_STATUS_CHOICES = [
    ('pending',   'Pending'),
    ('reviewed',  'Reviewed'),
    ('resolved',  'Resolved'),
]

class Complaint(models.Model):
    name           = models.CharField(max_length=150)
    email          = models.EmailField()
    complaint_type = models.CharField(max_length=30, choices=COMPLAINT_TYPE_CHOICES, default='other')
    message        = models.TextField()
    status         = models.CharField(max_length=20, choices=COMPLAINT_STATUS_CHOICES, default='pending')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.complaint_type} ({self.status})"


# ─── Tax Receipt Verification ─────────────────────────────────────────────────
class TaxReceiptVerification(models.Model):
    VERIFICATION_STATUS_CHOICES = [
        ('pending',     'Pending Verification'),
        ('extracting',  'Extracting Data'),
        ('extracted',   'Data Extracted'),
        ('verified',    'Verified'),
        ('rejected',    'Rejected'),
        ('failed',      'Extraction Failed'),
    ]

    property        = models.OneToOneField(Properties, on_delete=models.CASCADE, related_name='tax_verification')
    
    # Document metadata
    document_file   = models.FileField(upload_to='tax_receipts/')
    uploaded_at     = models.DateTimeField(auto_now_add=True)
    
    # Verification status
    status          = models.CharField(
        max_length=20, 
        choices=VERIFICATION_STATUS_CHOICES, 
        default='pending',
        help_text="Current verification status"
    )
    verification_source = models.CharField(
        max_length=30,
        default='automatic',
        help_text="Source of the verification result, such as automatic or manual"
    )
    verification_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured verification details such as portal checks, fraud flags, and score"
    )
    
    # Extracted data from OCR
    extracted_data  = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Data extracted from tax receipt (property details, tax amount, etc.)"
    )
    
    # Manual verification by admin
    is_manually_verified = models.BooleanField(default=False)
    verified_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_taxes')
    verified_at     = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True, help_text="Admin notes on verification")
    
    # Verification metadata
    extraction_error = models.TextField(blank=True, help_text="Error message if extraction failed")
    attempts        = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Tax Verification - {self.property.name} ({self.status})"