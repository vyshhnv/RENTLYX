from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import ObtainAuthToken
from django.conf import settings
from django.conf.urls.static import static
from app1 import views

# ================= ROUTER =================
# ⚠️  The router registers 'user', 'seller', 'properties' — these create
#     /api/user/, /api/seller/, /api/properties/ and their /<pk>/ variants.
#     ALL explicit paths that start with those prefixes MUST come BEFORE
#     path('api/', include(router.urls)) or Django will match the router first.
router = DefaultRouter()
router.register('user',       views.UserView,           basename="user")
router.register('seller',     views.SellerRegisterView, basename="seller")
router.register('properties', views.PropertiesViewSet,  basename="properties")


urlpatterns = [

    path('admin/', admin.site.urls),

    # ── AUTH ──────────────────────────────────────────────────────────────────
    path('api/auth/login/',   ObtainAuthToken.as_view(),       name='user_login'),
    path('api/seller/login/', views.SellerLoginView.as_view(),  name='seller_login'),

    # ── USER — explicit routes BEFORE router ──────────────────────────────────
    path('api/user/check-email/',      views.CheckUserEmailView.as_view()),
    path('api/user/send-email-otp/',   views.SendEmailOtpView.as_view()),
    path('api/user/verify-email-otp/', views.VerifyEmailOtpView.as_view()),
    path('api/user/profile/',          views.UserProfileView.as_view(),         name='user_profile'),
    path('api/user/forgot-password/',  views.UserForgotPasswordView.as_view()),
    path('api/user/reset-password/',   views.UserResetPasswordView.as_view()),

    # ── SELLER — explicit routes BEFORE router ────────────────────────────────
    path('api/seller/check-email/',      views.CheckSellerEmailView.as_view()),
    path('api/seller/send-email-otp/',   views.SendSellerEmailOTPView.as_view()),
    path('api/seller/verify-email-otp/', views.VerifySellerEmailOTPView.as_view()),
    path('api/seller/verify-pan/',       views.VerifyPANView.as_view()),
    path('api/seller/forgot-password/',  views.SellerForgotPasswordView.as_view()),
    path('api/seller/reset-password/',   views.SellerResetPasswordView.as_view()),
    path('api/seller/my-properties/',    views.MyPropertiesView.as_view(),       name='my_properties'),

    # ── PROPERTIES ────────────────────────────────────────────────────────────
    # ⚠️  CRITICAL ORDER: static-word paths MUST come before <int:pk> paths.
    #     Django matches top-to-bottom. "admin" and "analyze-pdf" would be
    #     mistaken for a pk integer and return 404 if placed after.

    # 1. Static-word routes first
    path('api/properties/admin/all/',             views.AdminPropertyListView.as_view(),    name='admin_property_list'),
    path('api/properties/analyze-pdf/',           views.AnalyzeConditionsPDFView.as_view(), name='analyze_pdf'),
    path('api/properties/images/<int:image_id>/', views.PropertyImageDeleteView.as_view(),  name='property_image_delete'),
    path('api/tax-verification/upload/', views.TaxReceiptUploadView.as_view(), name='tax_receipt_upload'),
    path('api/tax-verification/status/<int:property_id>/', views.TaxReceiptStatusView.as_view(), name='tax_receipt_status'),
    path('api/tax-verification/admin/all/', views.AdminTaxVerificationListView.as_view(), name='admin_tax_verifications'),

    # 2. Dynamic <int:pk> routes after
    path('api/properties/<int:pk>/approval/', views.AdminPropertyApprovalView.as_view(), name='admin_property_approval'),
    path('api/properties/<int:pk>/edit/',     views.PropertyUpdateView.as_view(),         name='property_edit'),
    path('api/properties/<int:pk>/delete/',   views.PropertyDeleteView.as_view(),         name='property_delete'),
    path('api/properties/<int:pk>/images/',   views.PropertyImageUploadView.as_view(),    name='property_images'),

    # ── COMPLAINTS ────────────────────────────────────────────────────────────
    # ⚠️  Same ordering rule: static-word paths before <int:pk> paths.
    path('api/complaints/',                  views.ComplaintCreateView.as_view(),      name='complaint_create'),
    path('api/complaints/by-email/',         views.ComplaintByEmailView.as_view(),     name='complaint_by_email'),
    path('api/complaints/admin/all/',        views.AdminComplaintListView.as_view(),   name='complaint_admin_list'),
    path('api/complaints/<int:pk>/status/',  views.AdminComplaintUpdateView.as_view(), name='complaint_admin_status'),
    path('api/complaints/<int:pk>/delete/',  views.AdminComplaintDeleteView.as_view(), name='complaint_admin_delete'),

    # ── OTHER APPS ────────────────────────────────────────────────────────────
    path('api/ai/',            include('ai_pricing.urls')),
    path('api/chat/',          include('chat_app.urls')),
    path('api/bookings/',      include('bookings.urls')),
    path('api/reviews/',       include('reviews.urls')),
    path('api/notifications/', include('notifications.urls')),

    # ── ROUTER — must be LAST so all explicit paths above win ─────────────────
    path('api/', include(router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)