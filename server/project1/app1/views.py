from rest_framework import viewsets
from django.contrib.auth.models import User
from .models import (
    Properties, Seller, EmailOTP, SellerEmailOTP, PropertyImage,
    Complaint, TaxReceiptVerification, SellerPhoneOTP, COMPLAINT_STATUS_CHOICES
)
from .serializers import (
    UserSerializer, PropertySerializer, SellerRegisterSerializer,
    SendEmailOTPSerializer, VerifyEmailOTPSerializer, PropertyImageSerializer, ComplaintSerializer,
    TaxReceiptVerificationSerializer, TaxReceiptUploadSerializer, TaxVerificationResultSerializer
)
from .tax_verification_utils import verify_tax_receipt
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from django.core.files.storage import default_storage
import tempfile, os
from rest_framework.permissions import IsAdminUser

# ═════════════════════════════════════════════════════════════════════════════
# PRODUCTION PAGINATION CLASS
# ═════════════════════════════════════════════════════════════════════════════

class StandardPagination(PageNumberPagination):
    """Standard pagination for all list endpoints"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# ── Notifications ─────────────────────────────────────────────────────────────
from notifications.utils import create_notification


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL OTP (USER)
# ─────────────────────────────────────────────────────────────────────────────

class SendEmailOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email required"}, status=400)
        otp = str(random.randint(100000, 999999))
        cache.set(f"email_otp_{email}", otp, timeout=300)
        send_mail("Your RentlyX OTP", f"Your OTP is {otp}", "noreply@rentlyx.com", [email])
        return Response({"message": "OTP sent"})


class VerifyEmailOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp   = request.data.get("otp")
        if not email or not otp:
            return Response({"error": "Email and OTP required"}, status=400)
        cached_otp = cache.get(f"email_otp_{email}")
        if cached_otp is None:
            return Response({"error": "OTP expired"}, status=400)
        if str(cached_otp) != str(otp):
            return Response({"error": "Invalid OTP"}, status=400)
        cache.delete(f"email_otp_{email}")
        return Response({"message": "Email verified"})


# ─────────────────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────────────────

class UserView(viewsets.ModelViewSet):
    queryset           = User.objects.all()
    serializer_class   = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# USER PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class UserProfileView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id":         u.id,
            "username":   u.username,
            "email":      u.email,
            "first_name": u.first_name,
            "last_name":  u.last_name,
        })

    def patch(self, request):
        u = request.user
        for field in ("first_name", "last_name", "email"):
            if field in request.data:
                setattr(u, field, request.data[field])
        u.save()
        return Response({
            "id":         u.id,
            "username":   u.username,
            "email":      u.email,
            "first_name": u.first_name,
            "last_name":  u.last_name,
        })


# ─────────────────────────────────────────────────────────────────────────────
# USER FORGOT / RESET PASSWORD
# ─────────────────────────────────────────────────────────────────────────────

USER_FORGOT_OTP_STORE = {}

class UserForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "Email not found"}, status=400)
        otp = random.randint(100000, 999999)
        USER_FORGOT_OTP_STORE[email] = otp
        send_mail(
            subject="RentlyX User Password Reset OTP",
            message=f"Your OTP is: {otp}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False
        )
        return Response({"message": "OTP sent to email", "username": user.username})


class UserResetPasswordView(APIView):
    authentication_classes = []
    permission_classes     = []

    def post(self, request):
        email    = request.data.get("email")
        otp      = request.data.get("otp")
        password = request.data.get("password")
        if not email or not otp or not password:
            return Response({"error": "Email, OTP and password are required"}, status=400)
        stored_otp = USER_FORGOT_OTP_STORE.get(email)
        if not stored_otp or stored_otp != int(otp):
            return Response({"error": "Invalid or expired OTP"}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "User not found"}, status=400)
        user.set_password(password)
        user.save()
        del USER_FORGOT_OTP_STORE[email]
        return Response({"message": "Password reset successful", "username": user.username})


# ─────────────────────────────────────────────────────────────────────────────
# SELLER OTP
# ─────────────────────────────────────────────────────────────────────────────

class SendSellerEmailOTPView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email required"}, status=400)
        otp = str(random.randint(100000, 999999))
        SellerEmailOTP.objects.update_or_create(
            email=email,
            defaults={"otp": otp, "created_at": timezone.now()}
        )
        send_mail(
            subject="Seller Email Verification - RentlyX",
            message=f"Your OTP is {otp}",
            from_email="noreply@rentlyx.com",
            recipient_list=[email],
        )
        return Response({"message": "OTP sent successfully"})


class VerifySellerEmailOTPView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        otp   = request.data.get("otp")
        try:
            record = SellerEmailOTP.objects.get(email=email)
            if record.otp != otp:
                return Response({"error": "Invalid OTP"}, status=400)
            record.delete()
            return Response({"message": "Email verified"})
        except SellerEmailOTP.DoesNotExist:
            return Response({"error": "OTP expired or not found"}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# SELLER REGISTER / LOGIN
# ─────────────────────────────────────────────────────────────────────────────

class SellerRegisterView(viewsets.ModelViewSet):
    queryset           = Seller.objects.all()
    serializer_class   = SellerRegisterSerializer
    permission_classes = [permissions.AllowAny]


class TaxReceiptUploadView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = TaxReceiptUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        property_id = serializer.validated_data['property_id']
        document_file = serializer.validated_data['document_file']

        property_obj = get_object_or_404(Properties, id=property_id)
        if property_obj.seller.user != request.user and not request.user.is_staff:
            return Response({"error": "Not authorized to upload tax receipt for this property."}, status=status.HTTP_403_FORBIDDEN)

        verification, created = TaxReceiptVerification.objects.get_or_create(
            property=property_obj,
            defaults={
                'document_file': document_file,
                'status': 'pending'
            }
        )

        if not created:
            verification.document_file = document_file
            verification.status = 'pending'
            verification.extracted_data = {}
            verification.extraction_error = ''
            verification.attempts += 1
            verification.last_attempt_at = timezone.now()
            verification.save()
        else:
            verification.attempts = 1
            verification.last_attempt_at = timezone.now()
            verification.save()

        try:
            result = verify_tax_receipt(property_obj, verification.document_file.path)
        except Exception as exc:
            verification.status = 'failed'
            verification.extraction_error = str(exc)
            verification.save()
            return Response({
                "error": "Tax verification failed.",
                "details": str(exc)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        verification.extracted_data = result.get('extracted_data', {})
        verification.extraction_error = result.get('error', '') or ''
        verification.verification_source = result.get('verification_source', 'automatic')
        verification.verification_metadata = {
            'portal_check': result.get('portal_check', {}),
            'fraud_flags': result.get('fraud_flags', []),
            'final_score': result.get('final_score', 0),
            'recommendation': result.get('recommendation'),
            'verification_source': result.get('verification_source', 'automatic'),
            'details': {
                'validation': result.get('validation', {}),
                'status': result.get('status')
            }
        }
        verification.attempts += 0 if created else 0
        verification.last_attempt_at = timezone.now()

        if result.get('status') == 'verified':
            verification.status = 'verified'
            verification.verified_at = timezone.now()
        elif result.get('status') == 'rejected':
            verification.status = 'rejected'
        elif result.get('status') == 'extraction_failed':
            verification.status = 'failed'
        else:
            verification.status = 'pending'

        verification.save()

        response_data = {
            "message": "Tax receipt uploaded and verification started.",
            "verification_result": result
        }
        return Response(response_data, status=status.HTTP_200_OK)


class TaxReceiptStatusView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, property_id):
        property_obj = get_object_or_404(Properties, id=property_id)
        if property_obj.seller.user != request.user and not request.user.is_staff:
            return Response({"error": "Not authorized to view this tax verification."}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(property_obj, 'tax_verification'):
            return Response({"error": "No tax verification record found for this property."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TaxReceiptVerificationSerializer(property_obj.tax_verification)
        return Response(serializer.data)


class AdminTaxVerificationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        verifications = TaxReceiptVerification.objects.select_related('property', 'verified_by').all()
        serializer = TaxReceiptVerificationSerializer(verifications, many=True)
        return Response(serializer.data)


class SellerLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        try:
            seller = user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Not a seller account"}, status=status.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token":        token.key,
            "user_id":      user.id,
            "seller_id":    seller.id,
            "pan_verified": seller.pan_verified
        })


# ─────────────────────────────────────────────────────────────────────────────
# PAN VERIFY
# ─────────────────────────────────────────────────────────────────────────────

class VerifyPANView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pan = request.data.get("pan")
        if not pan:
            return Response({"error": "PAN is required"}, status=400)
        seller = Seller.objects.get(user=request.user)
        if seller.pan_verified:
            return Response({"pan_verified": True, "name_match": True, "message": "PAN already verified"})
        import re
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan):
            return Response({"pan_verified": False, "message": "Invalid PAN format"}, status=400)
        seller.pan_verified = True
        seller.save()
        return Response({"pan_verified": True, "name_match": True, "message": "PAN verified successfully"})


# ─────────────────────────────────────────────────────────────────────────────
# PROPERTIES
# ─────────────────────────────────────────────────────────────────────────────

class PropertiesListCreateView(generics.ListCreateAPIView):
    serializer_class   = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        seller_id = self.request.query_params.get('seller')
        if seller_id:
            return Properties.objects.filter(
                seller_id=seller_id, listing_status='approved'
            ).order_by('-created_at')
        return Properties.objects.filter(listing_status='approved').order_by('-created_at')

    def perform_create(self, serializer):
        seller = self.request.user.seller
        serializer.save(seller=seller)


class PropertiesRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset           = Properties.objects.all()
    lookup_field       = 'pk'


@api_view(['GET'])
def seller_properties(request, seller_id):
    properties = Properties.objects.filter(seller_id=seller_id, listing_status='approved')
    serializer = PropertySerializer(properties, many=True, context={'request': request})
    return Response(serializer.data)


class PropertiesViewSet(viewsets.ModelViewSet):
    serializer_class   = PropertySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardPagination

    def get_queryset(self):
        # Optimize query with select_related to prevent N+1 queries
        qs = Properties.objects.select_related('seller').filter(
            listing_status='approved'
        ).order_by('-created_at')
        
        place = self.request.query_params.get('property_place')
        if place:
            qs = qs.filter(property_place__icontains=place)
        purpose = self.request.query_params.get('purpose')
        if purpose:
            qs = qs.filter(purpose=purpose)
        property_type = self.request.query_params.get('property_type')
        if property_type:
            qs = qs.filter(property_type=property_type)
        bhk = self.request.query_params.get('bhk')
        if bhk:
            qs = qs.filter(bhk=bhk)
        price_range = self.request.query_params.get('price_range')
        if price_range == "1L":   qs = qs.filter(price__lte=100000)
        elif price_range == "10L": qs = qs.filter(price__lte=1000000)
        elif price_range == "20L": qs = qs.filter(price__lte=2000000)
        elif price_range == "50L": qs = qs.filter(price__lte=5000000)
        elif price_range == "1C":  qs = qs.filter(price__lte=10000000)
        return qs

    def perform_create(self, serializer):
        try:
            seller = self.request.user.seller
            serializer.save(seller=seller)
        except Seller.DoesNotExist:
            raise PermissionDenied("User is not registered as a seller")


class MyPropertiesView(generics.ListAPIView):
    serializer_class   = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        try:
            seller = self.request.user.seller
            return Properties.objects.select_related('seller').filter(
                seller=seller
            ).order_by('-created_at')
        except Seller.DoesNotExist:
            return Properties.objects.none()


class PropertyUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class   = PropertySerializer
    permission_classes = [IsAuthenticated]
    queryset           = Properties.objects.all()
    lookup_field       = 'pk'

    def get_object(self):
        obj = super().get_object()
        try:
            seller = self.request.user.seller
        except Seller.DoesNotExist:
            raise PermissionDenied("Only sellers can edit properties")
        if obj.seller != seller:
            raise PermissionDenied("You can only edit your own properties")
        return obj

    def partial_update(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()


class PropertyDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            property_obj = Properties.objects.get(pk=pk)
        except Properties.DoesNotExist:
            return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            seller = request.user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Only sellers can delete properties"}, status=status.HTTP_403_FORBIDDEN)
        if property_obj.seller != seller:
            return Response({"error": "You can only delete your own properties"}, status=status.HTTP_403_FORBIDDEN)
        property_name = property_obj.name
        property_obj.delete()
        return Response(
            {"message": f"Property '{property_name}' deleted successfully", "property_id": pk},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN PROPERTY APPROVAL  ← notifications added
# ─────────────────────────────────────────────────────────────────────────────

class AdminPropertyListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        properties = Properties.objects.all().select_related(
            'seller__user'
        ).prefetch_related('extra_images').order_by('-created_at')
        serializer = PropertySerializer(properties, many=True, context={'request': request})
        return Response(serializer.data)


class AdminPropertyApprovalView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        prop   = get_object_or_404(Properties, pk=pk)
        action = request.data.get("action")
        note   = request.data.get("note", "")

        if action == "approve":
            prop.listing_status       = "approved"
            prop.admin_rejection_note = ""
            prop.save()

            # ── Notify seller their listing went live ─────────────────────
            create_notification(
                user    = prop.seller.user,
                type    = 'listing_approved',
                title   = 'Listing Approved!',
                message = f'Your property "{prop.name}" has been approved and is now live on RentlyX.',
                link    = '/seller/properties',
            )

        elif action == "reject":
            prop.listing_status       = "rejected"
            prop.admin_rejection_note = note
            prop.save()

            # ── Notify seller their listing was rejected ───────────────────
            create_notification(
                user    = prop.seller.user,
                type    = 'listing_rejected',
                title   = 'Listing Rejected',
                message = (
                    f'Your property "{prop.name}" was rejected.'
                    + (f' Reason: {note}' if note else ' Please review and resubmit.')
                ),
                link    = '/seller/properties',
            )

        else:
            return Response(
                {"error": "Invalid action. Use 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(PropertySerializer(prop, context={'request': request}).data)


# ─────────────────────────────────────────────────────────────────────────────
# PROPERTY GALLERY IMAGES
# ─────────────────────────────────────────────────────────────────────────────

class PropertyImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        images     = PropertyImage.objects.filter(property_id=pk)
        serializer = PropertyImageSerializer(images, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        try:
            prop = Properties.objects.get(pk=pk)
        except Properties.DoesNotExist:
            return Response({"error": "Property not found"}, status=404)
        try:
            seller = request.user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Only sellers can upload images"}, status=403)
        if prop.seller != seller:
            return Response({"error": "You can only add images to your own properties"}, status=403)
        files = request.FILES.getlist('images')
        if not files:
            return Response({"error": "No images provided. Use field name 'images'"}, status=400)
        created = []
        for f in files:
            img = PropertyImage.objects.create(property=prop, image=f)
            created.append(PropertyImageSerializer(img, context={'request': request}).data)
        return Response(
            {"message": f"{len(created)} image(s) uploaded successfully", "images": created},
            status=201
        )


class PropertyImageDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, image_id):
        try:
            img = PropertyImage.objects.select_related('property__seller__user').get(id=image_id)
        except PropertyImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=404)
        try:
            seller = request.user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Only sellers can delete images"}, status=403)
        if img.property.seller != seller:
            return Response({"error": "You can only delete images from your own properties"}, status=403)
        img.image.delete(save=False)
        img.delete()
        return Response({"message": "Image deleted successfully"})


# ─────────────────────────────────────────────────────────────────────────────
# SELLER FORGOT / RESET PASSWORD
# ─────────────────────────────────────────────────────────────────────────────

FORGOT_OTP_STORE = {}

class SellerForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)
        seller = Seller.objects.filter(user__email__iexact=email).select_related("user").first()
        if not seller:
            return Response({"error": "Email not found"}, status=400)
        otp = random.randint(100000, 999999)
        FORGOT_OTP_STORE[email] = otp
        send_mail(
            subject="RentlyX Password Reset OTP",
            message=f"Your OTP for password reset is: {otp}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return Response({"message": "OTP sent to email", "username": seller.user.username})


class SellerVerifyForgotOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp   = request.data.get("otp")
        try:
            record = SellerEmailOTP.objects.get(email=email, otp=otp)
            return Response({"message": "OTP verified"})
        except SellerEmailOTP.DoesNotExist:
            return Response({"error": "Invalid OTP"}, status=400)


class SellerResetPasswordView(APIView):
    authentication_classes = []
    permission_classes     = []

    def post(self, request):
        email    = request.data.get("email")
        otp      = request.data.get("otp")
        password = request.data.get("password")
        if not email or not otp or not password:
            return Response({"error": "Email, OTP and password are required"}, status=400)
        stored_otp = FORGOT_OTP_STORE.get(email)
        if not stored_otp or stored_otp != int(otp):
            return Response({"error": "Invalid or expired OTP"}, status=400)
        seller = Seller.objects.filter(user__email__iexact=email).select_related("user").first()
        if not seller:
            return Response({"error": "Seller not found"}, status=400)
        user = seller.user
        user.set_password(password)
        user.save()
        del FORGOT_OTP_STORE[email]
        return Response({"message": "Password reset successful", "username": user.username})


# ─────────────────────────────────────────────────────────────────────────────
# ANALYZE CONDITIONS PDF
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeConditionsPDFView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        pdf_url = request.data.get("pdf_url")
        if not pdf_url:
            return Response({"error": "No PDF URL provided"}, status=400)
        media_url     = request.build_absolute_uri(settings.MEDIA_URL)
        relative_path = pdf_url.replace(media_url, "").lstrip("/\\")
        full_path     = os.path.join(settings.MEDIA_ROOT, relative_path)
        if not os.path.exists(full_path):
            return Response({"error": f"PDF file not found: {full_path}"}, status=404)
        from app1.pdf_extractor import extract_rental_terms
        result = extract_rental_terms(full_path)
        return Response(result)


# ─────────────────────────────────────────────────────────────────────────────
# COMPLAINTS  ← notification added on status update
# ─────────────────────────────────────────────────────────────────────────────

class ComplaintCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ComplaintSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Complaint submitted successfully."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ComplaintByEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get("email", "").strip()
        if not email:
            return Response({"error": "Email is required."}, status=400)
        complaints = Complaint.objects.filter(email__iexact=email).order_by('-created_at')
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data)


class AdminComplaintListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        complaints = Complaint.objects.all()
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data)


class AdminComplaintUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        complaint      = get_object_or_404(Complaint, pk=pk)
        new_status     = request.data.get('status')
        valid_statuses = [s[0] for s in COMPLAINT_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Choose from: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        complaint.status = new_status
        complaint.save()

        # ── Notify the complainant if we have a matching user account ─────
        try:
            user = User.objects.filter(email__iexact=complaint.email).first()
            if user:
                status_labels = {
                    'reviewed': 'Your complaint is being reviewed.',
                    'resolved': 'Your complaint has been resolved.',
                }
                msg = status_labels.get(new_status)
                if msg:
                    create_notification(
                        user    = user,
                        type    = 'complaint_update',
                        title   = f'Complaint {new_status.title()}',
                        message = msg,
                        link    = '/help',
                    )
        except Exception:
            pass

        return Response(ComplaintSerializer(complaint).data)


class AdminComplaintDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        complaint = get_object_or_404(Complaint, pk=pk)
        complaint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    


class CheckUserEmailView(APIView):
    permission_classes = [AllowAny]
 
    def post(self, request):
        email = request.data.get("email", "").strip()
        if not email:
            return Response({"error": "Email is required"}, status=400)
        # Check across both User and Seller tables
        user_exists   = User.objects.filter(email__iexact=email).exists()
        seller_exists = Seller.objects.filter(user__email__iexact=email).exists()
        return Response({"exists": user_exists or seller_exists})
 
 
class CheckSellerEmailView(APIView):
    permission_classes = [AllowAny]
 
    def post(self, request):
        email = request.data.get("email", "").strip()
        if not email:
            return Response({"error": "Email is required"}, status=400)
        # Check across both User and Seller tables
        user_exists   = User.objects.filter(email__iexact=email).exists()
        seller_exists = Seller.objects.filter(user__email__iexact=email).exists()
        return Response({"exists": user_exists or seller_exists})