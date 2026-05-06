from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.generics import get_object_or_404
from rest_framework import status

from app1.models import Properties
from bookings.models import Booking
from .models import PropertyReview
from .serializers import ReviewSerializer, ReviewCreateSerializer

# ── Notifications ─────────────────────────────────────────────────────────────
from notifications.utils import create_notification


class SubmitReviewView(APIView):
    """
    POST /api/reviews/submit/
    Buyer submits a review. Only allowed if they have a completed booking.
    One review per user per property.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            prop = Properties.objects.get(id=data['property_id'])
        except Properties.DoesNotExist:
            return Response({"error": "Property not found"}, status=404)

        eligible_booking = Booking.objects.filter(
            property=prop,
            user=request.user,
            status__in=['accepted', 'refunded', 'cancelled']
        ).first()

        if not eligible_booking:
            return Response(
                {"error": "You can only review properties you have booked."},
                status=status.HTTP_403_FORBIDDEN
            )

        if PropertyReview.objects.filter(property=prop, user=request.user).exists():
            return Response(
                {"error": "You have already reviewed this property."},
                status=status.HTTP_400_BAD_REQUEST
            )

        review = PropertyReview.objects.create(
            property=prop,
            user=request.user,
            booking=eligible_booking,
            rating=data['rating'],
            comment=data.get('comment', ''),
        )

        # ── Notify the seller they got a new review ───────────────────────
        star_display = "★" * review.rating + "☆" * (5 - review.rating)
        create_notification(
            user    = prop.seller.user,
            type    = 'review_received',
            title   = f'New Review on "{prop.name}"',
            message = (
                f'{request.user.username} left a {review.rating}/5 ({star_display}) review'
                + (f': "{review.comment[:80]}..."' if len(review.comment) > 80
                   else (f': "{review.comment}"' if review.comment else '.'))
            ),
            link    = f'/seller/property/{prop.id}',
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class UpdateReviewView(APIView):
    """
    PATCH /api/reviews/<review_id>/update/
    Buyer updates their own review.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, review_id):
        review  = get_object_or_404(PropertyReview, id=review_id, user=request.user)
        rating  = request.data.get('rating')
        comment = request.data.get('comment')

        if rating is not None:
            if not (1 <= int(rating) <= 5):
                return Response({"error": "Rating must be between 1 and 5"}, status=400)
            review.rating = int(rating)

        if comment is not None:
            review.comment = comment

        review.save()
        return Response(ReviewSerializer(review).data)


class PropertyReviewsView(APIView):
    """
    GET /api/reviews/property/<property_id>/
    Public: all reviews for a property with average rating.
    """
    permission_classes = [AllowAny]

    def get(self, request, property_id):
        reviews    = PropertyReview.objects.filter(
            property_id=property_id
        ).select_related('user', 'property')
        serialized = ReviewSerializer(reviews, many=True).data
        avg        = (
            sum(r['rating'] for r in serialized) / len(serialized)
            if serialized else None
        )
        return Response({
            "count":          len(serialized),
            "average_rating": round(avg, 1) if avg else None,
            "reviews":        serialized,
        })


class MyReviewsView(APIView):
    """
    GET /api/reviews/my/
    Returns all reviews the logged-in user has submitted, keyed by property_id.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = PropertyReview.objects.filter(
            user=request.user
        ).select_related('user', 'property')
        data = {
            str(r.property_id): ReviewSerializer(r).data
            for r in reviews
        }
        return Response(data)


# ── Admin views ────────────────────────────────────────────────────────────────

class AdminAllReviewsView(APIView):
    """
    GET /api/reviews/admin/all/
    Admin only: return every review across all properties.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        reviews = PropertyReview.objects.select_related(
            'user', 'property', 'booking'
        ).order_by('-created_at')
        return Response(ReviewSerializer(reviews, many=True).data)


class AdminDeleteReviewView(APIView):
    """
    DELETE /api/reviews/<review_id>/delete/
    Admin only: hard-delete any review.
    """
    permission_classes = [IsAdminUser]

    def delete(self, request, review_id):
        review = get_object_or_404(PropertyReview, id=review_id)
        review.delete()
        return Response({"message": "Review deleted."}, status=status.HTTP_204_NO_CONTENT)