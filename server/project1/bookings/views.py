import razorpay
from decimal import Decimal
import logging
import hmac
import hashlib

from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from app1.models import Properties, Seller
from .models import Booking
from bookings.serializer import BookingCreateSerializer, BookingVerifySerializer, BookingSerializer

# ── Notifications ─────────────────────────────────────────────────────────────
from notifications.utils import create_notification

# ── Logging ─────────────────────────────────────────────────────────────────
logger = logging.getLogger('rentlyx')

# ── Razorpay client ──────────────────────────────────────────────────────────
try:
    razorpay_client = razorpay.Client(
        auth=(settings.RZP_KEY_ID, settings.RZP_KEY_SECRET)
    )
except Exception as e:
    logger.error(f"Failed to initialize Razorpay client: {str(e)}")
    razorpay_client = None

TOKEN_PERCENTAGE = Decimal('0.05')


class CreateBookingOrderView(APIView):
    """
    POST /api/bookings/create-order/
    Token amount = 5% of property price (auto-calculated)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = BookingCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            try:
                prop = Properties.objects.get(id=data['property_id'])
            except Properties.DoesNotExist:
                logger.warning(f"Property {data['property_id']} not found for user {request.user.id}")
                return Response({"error": "Property not found"}, status=404)

            # Check if property is already booked
            if Booking.objects.filter(
                property=prop, 
                status__in=['accepted', 'payment_pending']
            ).exists():
                logger.warning(f"Property {prop.id} already has active booking")
                return Response(
                    {"error": "This property is already booked"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not razorpay_client:
                logger.error("Razorpay client not initialized")
                return Response(
                    {"error": "Payment gateway is unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            property_price = Decimal(str(prop.price))
            
            # Validate price
            if property_price <= 0:
                logger.error(f"Invalid property price: {property_price}")
                return Response(
                    {"error": "Invalid property price"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token_amount   = round(property_price * TOKEN_PERCENTAGE, 2)
            amount_paise   = int(token_amount * 100)

            try:
                razorpay_order = razorpay_client.order.create({
                    "amount":          amount_paise,
                    "currency":        "INR",
                    "payment_capture": 1,
                    "notes": {
                        "property_id":      str(prop.id),
                        "property_name":    prop.name,
                        "buyer":            request.user.username,
                        "token_percentage": "5%",
                    }
                })
            except Exception as e:
                logger.error(f"Razorpay order creation failed: {str(e)}")
                return Response(
                    {"error": "Failed to create payment order. Please try again."},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            # Use transaction.atomic to ensure consistency
            with transaction.atomic():
                booking = Booking.objects.create(
                    property=prop,
                    user=request.user,
                    token_amount=token_amount,
                    property_price=property_price,
                    razorpay_order_id=razorpay_order['id'],
                    status='payment_pending',
                    user_name=data['user_name'],
                    user_phone=data['user_phone'],
                    user_message=data.get('user_message', ''),
                    expires_at=timezone.now() + timezone.timedelta(hours=48),
                )

            logger.info(f"Order created: {razorpay_order['id']} for property {prop.id}")

            return Response({
                "order_id":         razorpay_order['id'],
                "amount":           amount_paise,
                "currency":         "INR",
                "key":              settings.RZP_KEY_ID,
                "booking_id":       booking.id,
                "property_name":    prop.name,
                "property_price":   str(property_price),
                "token_amount":     str(token_amount),
                "token_percentage": "5%",
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception(f"Unexpected error in CreateBookingOrderView: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyBookingPaymentView(APIView):
    """
    POST /api/bookings/verify-payment/
    Verify Razorpay signature and confirm booking
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = BookingVerifySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            # Verify Razorpay signature
            try:
                razorpay_client.utility.verify_payment_signature({
                    'razorpay_order_id':  data['razorpay_order_id'],
                    'razorpay_payment_id': data['razorpay_payment_id'],
                    'razorpay_signature': data['razorpay_signature'],
                })
                logger.info(f"Payment signature verified for order {data['razorpay_order_id']}")
            except razorpay.errors.SignatureVerificationError as e:
                logger.warning(f"Payment signature verification failed: {str(e)}")
                return Response(
                    {"error": "Payment verification failed. Invalid signature."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Payment verification error: {str(e)}")
                return Response(
                    {"error": "Payment verification error. Please contact support."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Retrieve booking with update lock to prevent race conditions
            try:
                with transaction.atomic():
                    booking = Booking.objects.select_for_update().get(
                        razorpay_order_id=data['razorpay_order_id'],
                        user=request.user
                    )

                    # Check if already confirmed
                    if booking.status == 'accepted':
                        logger.warning(f"Booking {booking.id} already confirmed")
                        return Response(
                            {"message": "Booking already confirmed", "booking_id": booking.id, "status": "accepted"},
                            status=status.HTTP_200_OK
                        )

                    # Update booking
                    booking.razorpay_payment_id = data['razorpay_payment_id']
                    booking.razorpay_signature  = data['razorpay_signature']
                    booking.status = 'accepted'
                    booking.payment_confirmed_at = timezone.now()
                    booking.save()

                    logger.info(f"Booking {booking.id} payment confirmed")

            except Booking.DoesNotExist:
                logger.warning(f"Booking not found for order {data['razorpay_order_id']}")
                return Response(
                    {"error": "Booking not found. This might be a fraudulent payment attempt."},
                    status=404
                )

            # Notify buyer
            try:
                create_notification(
                    user    = booking.user,
                    type    = 'booking_received',
                    title   = 'Booking Submitted',
                    message = f'Your booking for "{booking.property.name}" is pending seller approval. You will be notified once the seller responds.',
                    link    = '/my-bookings',
                )
            except Exception as e:
                logger.error(f"Failed to notify buyer: {str(e)}")

            # Notify seller
            try:
                create_notification(
                    user    = booking.property.seller.user,
                    type    = 'booking_received',
                    title   = 'New Booking Request',
                    message = f'{booking.user_name} has placed a ₹{booking.token_amount} token booking for "{booking.property.name}". Respond within 48 hours.',
                    link    = '/seller/bookings',
                )
            except Exception as e:
                logger.error(f"Failed to notify seller: {str(e)}")

            # Email seller (best effort)
            try:
                send_mail(
                    subject=f"New Booking Request – {booking.property.name}",
                    message=(
                        f"Hi {booking.property.seller.user.username},\n\n"
                        f"{booking.user_name} has placed a token booking for your property "
                        f"'{booking.property.name}'.\n\n"
                        f"Property Price : ₹{booking.property_price}\n"
                        f"Token Paid (5%): ₹{booking.token_amount}\n"
                        f"Buyer Phone    : {booking.user_phone}\n"
                        f"Message        : {booking.user_message or 'No message'}\n\n"
                        f"Please log in to your RentlyX dashboard to Accept or Reject "
                        f"within 48 hours.\n\n— RentlyX Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[booking.property.seller.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send email to seller: {str(e)}")

            return Response({
                "message":    "Payment verified. Booking is pending seller approval.",
                "booking_id": booking.id,
                "status":     "accepted",
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Unexpected error in VerifyBookingPaymentView: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SellerBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff or request.user.is_superuser:
            bookings = Booking.objects.all().select_related(
                'property__seller__user', 'user'
            ).order_by('-created_at')
            serializer = BookingSerializer(bookings, many=True)
            return Response(serializer.data)

        try:
            seller = request.user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Not a seller account"}, status=403)

        bookings = Booking.objects.filter(
            property__seller=seller
        ).select_related('property', 'user').order_by('-created_at')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class SellerBookingActionView(APIView):
    """
    POST /api/bookings/<booking_id>/action/
    Body: { "action": "accept" | "reject" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            seller = request.user.seller
        except Seller.DoesNotExist:
            return Response({"error": "Not a seller account"}, status=403)

        try:
            booking = Booking.objects.get(id=booking_id, property__seller=seller)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        if booking.status not in ['pending', 'accepted']:
            return Response(
                {"error": f"Booking cannot be modified. Current status: {booking.status}"},
                status=400
            )

        if booking.is_expired():
            booking.status = 'cancelled'
            booking.save()
            return Response({"error": "Booking has expired"}, status=400)

        action = request.data.get('action')

        # ── ACCEPT ────────────────────────────────────────────────────────
        if action == 'accept':
            booking.status = 'accepted'
            booking.save()

            # ── Notify buyer ──────────────────────────────────────────────
            create_notification(
                user    = booking.user,
                type    = 'booking_accepted',
                title   = 'Booking Accepted!',
                message = f'Your booking for "{booking.property.name}" has been accepted. The seller will contact you at {booking.user_phone} shortly.',
                link    = '/my-bookings',
            )

            try:
                send_mail(
                    subject=f"Booking Accepted – {booking.property.name}",
                    message=(
                        f"Hi {booking.user_name},\n\n"
                        f"Great news! The seller has accepted your booking for "
                        f"'{booking.property.name}'.\n\n"
                        f"Token Paid (5%): ₹{booking.token_amount}\n"
                        f"Remaining Amount: ₹{booking.property_price - booking.token_amount}\n"
                        f"The seller will contact you at {booking.user_phone} shortly.\n\n"
                        f"— RentlyX Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[booking.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

            return Response({
                "message":    "Booking accepted successfully",
                "booking_id": booking.id,
                "status":     "accepted",
            })

        # ── REJECT ────────────────────────────────────────────────────────
        elif action == 'reject':
            booking.status = 'rejected'
            booking.save()

            refund_success = False
            try:
                razorpay_client.payment.refund(
                    booking.razorpay_payment_id,
                    {
                        "amount": int(booking.token_amount * 100),
                        "notes": {
                            "reason":     "Seller rejected the booking",
                            "booking_id": str(booking.id),
                        }
                    }
                )
                booking.status = 'refunded'
                booking.save()
                refund_success = True
            except Exception as e:
                print(f"Refund failed for booking {booking.id}: {e}")

            # ── Notify buyer ──────────────────────────────────────────────
            create_notification(
                user    = booking.user,
                type    = 'booking_rejected',
                title   = 'Booking Rejected',
                message = (
                    f'Your booking for "{booking.property.name}" was declined by the seller. '
                    + (f'A refund of ₹{booking.token_amount} has been initiated.' if refund_success
                       else f'Our team will process your refund of ₹{booking.token_amount}.')
                ),
                link    = '/my-bookings',
            )

            try:
                send_mail(
                    subject=f"Booking Update – {booking.property.name}",
                    message=(
                        f"Hi {booking.user_name},\n\n"
                        f"Unfortunately, the seller has declined your booking for "
                        f"'{booking.property.name}'.\n\n"
                        + (
                            f"A full refund of ₹{booking.token_amount} has been initiated "
                            f"and will reflect in 5-7 business days."
                            if refund_success else
                            f"Our team will process your refund of ₹{booking.token_amount} "
                            f"within 7 business days."
                        )
                        + f"\n\n— RentlyX Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[booking.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

            return Response({
                "message":          "Booking rejected. Refund initiated.",
                "booking_id":       booking.id,
                "status":           booking.status,
                "refund_initiated": refund_success,
            })

        else:
            return Response(
                {"error": "Invalid action. Use 'accept' or 'reject'"},
                status=400
            )


class PropertyBookingStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, property_id):
        active_booking = Booking.objects.filter(
            property_id=property_id,
            status__in=['pending', 'accepted']
        ).first()

        try:
            prop          = Properties.objects.get(id=property_id)
            token_preview = round(Decimal(str(prop.price)) * TOKEN_PERCENTAGE, 2)
        except Properties.DoesNotExist:
            token_preview = None

        if not active_booking:
            return Response({
                "status":           "available",
                "booking_id":       None,
                "token_amount":     str(token_preview),
                "token_percentage": "5%",
            })

        return Response({
            "status":           active_booking.status,
            "booking_id":       active_booking.id,
            "token_amount":     str(token_preview),
            "token_percentage": "5%",
        })


class UserBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings   = Booking.objects.filter(user=request.user).select_related('property').order_by('-created_at')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class CancelBookingView(APIView):
    """
    POST /api/bookings/<booking_id>/cancel/
    Buyer cancels their own pending or accepted booking
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        if booking.status not in ['pending', 'accepted']:
            return Response(
                {"error": f"This booking cannot be cancelled. Current status: {booking.status}"},
                status=400
            )

        refund_success = False
        try:
            razorpay_client.payment.refund(
                booking.razorpay_payment_id,
                {
                    "amount": int(booking.token_amount * 100),
                    "notes": {
                        "reason":     "Buyer cancelled the booking",
                        "booking_id": str(booking.id),
                    }
                }
            )
            booking.status = 'refunded'
            refund_success = True
        except Exception as e:
            print(f"Refund failed for booking {booking.id}: {e}")
            booking.status = 'cancelled'

        booking.save()

        # ── Notify seller: buyer cancelled ────────────────────────────────
        create_notification(
            user    = booking.property.seller.user,
            type    = 'booking_cancelled',
            title   = 'Booking Cancelled',
            message = f'{booking.user_name} cancelled their booking for "{booking.property.name}". The token has been refunded to the buyer.',
            link    = '/seller/bookings',
        )

        # ── Notify buyer: refund status ───────────────────────────────────
        create_notification(
            user    = booking.user,
            type    = 'booking_refunded',
            title   = 'Booking Cancelled' + (' – Refund Initiated' if refund_success else ''),
            message = (
                f'Your booking for "{booking.property.name}" has been cancelled. '
                + (f'A refund of ₹{booking.token_amount} will reflect in 5–7 business days.' if refund_success
                   else f'Our team will process your refund of ₹{booking.token_amount}.')
            ),
            link    = '/my-bookings',
        )

        try:
            send_mail(
                subject=f"Booking Cancelled – {booking.property.name}",
                message=(
                    f"Hi {booking.property.seller.user.username},\n\n"
                    f"{booking.user_name} has cancelled their booking for "
                    f"'{booking.property.name}'.\n\n"
                    f"Token Amount: ₹{booking.token_amount}\n\n"
                    f"— RentlyX Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.property.seller.user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            "message":          "Booking cancelled successfully.",
            "booking_id":       booking.id,
            "status":           booking.status,
            "refund_initiated": refund_success,
        })