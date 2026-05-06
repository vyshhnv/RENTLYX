from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, MessageViewSet, get_seller_info, GetOrCreateChatRoomView

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('rooms/get_or_create/', GetOrCreateChatRoomView.as_view()),  # ← FIRST
    path('seller/<int:seller_id>/', get_seller_info),
    path('', include(router.urls)),  # ← LAST
]