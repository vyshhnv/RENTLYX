from rest_framework import serializers
from django.contrib.auth.models import User
from app1.models import Properties, Seller, EmailOTP, PropertyImage, Complaint, TaxReceiptVerification
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from .models import EmailOTP, PropertyImage
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import random


class UserSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)

    # ← Remove default validator so spaces are allowed in usernames
    username = serializers.CharField(
        max_length=150,
        validators=[]
    )

    class Meta:
        model  = User
        fields = (
            "id",
            "username",
            "email",
            "password1",
            "password2",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
        )
        read_only_fields = ("id", "is_staff", "is_active")

    def validate_username(self, value):
        # Strip leading/trailing spaces only
        value = value.strip()
        # Check uniqueness manually (since we removed the default validator)
        qs = User.objects.filter(username__iexact=value)
        # Exclude current instance on updates
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate(self, data):
        p1 = data.get("password1")
        p2 = data.get("password2")
        if p1 or p2:
            if p1 != p2:
                raise serializers.ValidationError("Passwords do not match")
            validate_password(p1)
        return data

    def create(self, validated_data):
        validated_data.pop("password2", None)
        password = validated_data.pop("password1", None)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=password,
        )
        return user


class SellerRegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        write_only=True,
        max_length=150,
        validators=[]   # ← allow spaces for sellers too
    )
    email    = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    user     = UserSerializer(read_only=True)

    class Meta:
        model  = Seller
        fields = ["id", "username", "email", "password", "phone", "address", "user", "pan_verified"]
        read_only_fields = ["pan_verified"]

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        username = validated_data.pop('username')
        email    = validated_data.pop('email')
        password = validated_data.pop('password')

        from .models import SellerEmailOTP
        if SellerEmailOTP.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Email not verified"})

        user   = User.objects.create_user(username=username, email=email, password=password)
        seller = Seller.objects.create(user=user, **validated_data)
        return seller


class SendEmailOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        email = validated_data['email']
        otp   = str(random.randint(100000, 999999))
        obj, created = EmailOTP.objects.update_or_create(
            email=email,
            defaults={'otp': otp, 'is_verified': False}
        )
        send_mail(
            subject="Your Email Verification OTP",
            message=f"Your OTP is {otp}. Valid for 10 minutes.",
            from_email=None,
            recipient_list=[email],
        )
        return validated_data


class VerifyEmailOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp   = serializers.CharField(max_length=6)

    def validate(self, data):
        email = data['email']
        otp   = data['otp']
        try:
            obj = EmailOTP.objects.get(email=email)
        except EmailOTP.DoesNotExist:
            raise serializers.ValidationError("OTP not sent to this email")
        if obj.is_expired():
            raise serializers.ValidationError("OTP expired")
        if obj.otp != otp:
            raise serializers.ValidationError("Invalid OTP")
        obj.is_verified = True
        obj.save()
        return data


class SellerMiniSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = Seller
        fields = ["id", "phone", "user"]


# ─── Gallery image serializer ─────────────────────────────────────────────────
class PropertyImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = PropertyImage
        fields = ['id', 'image', 'image_url', 'caption', 'order', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at', 'image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return (
                request.build_absolute_uri(obj.image.url)
                if request
                else f"http://127.0.0.1:8000{obj.image.url}"
            )
        return None


# ─── PropertySerializer — includes extra_images ───────────────────────────────
class PropertySerializer(serializers.ModelSerializer):
    seller       = SellerMiniSerializer(read_only=True)
    extra_images = PropertyImageSerializer(many=True, read_only=True)

    class Meta:
        model            = Properties
        fields           = '__all__'
        read_only_fields = ['seller', 'listing_status', 'admin_rejection_note']
        extra_kwargs     = {
            'property_image': {'required': False},
        }

    def validate_price(self, value):
        """Validate property price is reasonable"""
        from app1.validators import validate_price
        validate_price(value)
        return value

    def validate_built_up_area(self, value):
        """Validate property area"""
        from app1.validators import validate_built_up_area
        validate_built_up_area(value)
        return value

    def validate_bathrooms(self, value):
        """Validate bathroom count"""
        from app1.validators import validate_bathroom_count
        validate_bathroom_count(value)
        return value

    def validate_description(self, value):
        """Validate description length"""
        from app1.validators import validate_description_length
        validate_description_length(value)
        return value

    def validate_property_place(self, value):
        """Validate property location"""
        from app1.validators import validate_property_place
        validate_property_place(value)
        return value

    def validate(self, data):
        """Validate coordinates if provided"""
        from app1.validators import validate_coordinates
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        validate_coordinates(latitude, longitude)
        return data

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Complaint
        fields = ['id', 'name', 'email', 'complaint_type', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


# ─── Tax Receipt Verification Serializers ─────────────────────────────────────
class TaxReceiptVerificationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    property_id = serializers.IntegerField(source='property.id', read_only=True)

    class Meta:
        model = TaxReceiptVerification
        fields = [
            'id',
            'property',
            'property_id',
            'property_name',
            'document_file',
            'status',
            'verification_source',
            'verification_metadata',
            'extracted_data',
            'is_manually_verified',
            'verified_by',
            'verified_by_name',
            'verified_at',
            'verification_notes',
            'extraction_error',
            'attempts',
            'last_attempt_at',
            'uploaded_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'verification_source',
            'verification_metadata',
            'extracted_data',
            'verified_by',
            'verified_at',
            'extraction_error',
            'attempts',
            'last_attempt_at',
            'uploaded_at',
            'created_at',
            'updated_at',
        ]


class TaxReceiptUploadSerializer(serializers.Serializer):
    """Simplified serializer for uploading tax receipts"""
    property_id = serializers.IntegerField()
    document_file = serializers.FileField(required=True)

    def validate_document_file(self, value):
        allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png']
        file_extension = value.name.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File format not allowed. Allowed formats: {', '.join(allowed_extensions)}"
            )
        
        if value.size > 10 * 1024 * 1024:  # 10MB limit
            raise serializers.ValidationError("File size must not exceed 10MB")
        
        return value


class TaxVerificationResultSerializer(serializers.Serializer):
    """Serializer for verification result response"""
    status = serializers.CharField()
    extracted_data = serializers.DictField()
    validation = serializers.DictField()
    portal_check = serializers.DictField()
    final_result = serializers.BooleanField()
    recommendation = serializers.CharField()
    error = serializers.CharField(required=False, allow_blank=True)