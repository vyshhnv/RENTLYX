from django.urls import path
from . import views

urlpatterns = [
    # Step 1: Create Razorpay order
    path('create-order/', views.CreateBookingOrderView.as_view(), name='booking_create_order'),

    # Step 2: Verify payment after Razorpay callback
    path('verify-payment/', views.VerifyBookingPaymentView.as_view(), name='booking_verify_payment'),

    # Seller: view all bookings for their properties
    path('seller/', views.SellerBookingsView.as_view(), name='seller_bookings'),

    # Seller: accept or reject a specific booking
    path('<int:booking_id>/action/', views.SellerBookingActionView.as_view(), name='booking_action'),

    # Public: get booking status for a property (for badge display)
    path('property/<int:property_id>/status/', views.PropertyBookingStatusView.as_view(), name='property_booking_status'),

    # User: see their own bookings
    path('my/', views.UserBookingsView.as_view(), name='user_bookings'),

    # ✅ Admin: GET /api/bookings/admin/all/
    # Reuses SellerBookingsView — it already checks request.user.is_staff
    # and returns ALL bookings when the logged-in user is a superuser/staff
    path('admin/all/', views.SellerBookingsView.as_view(), name='admin_all_bookings'),

    path('<int:booking_id>/cancel/', views.CancelBookingView.as_view(), name='booking_cancel'),
]