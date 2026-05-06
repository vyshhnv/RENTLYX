from django.shortcuts import render
from rest_framework.views import APIView
from app1.models import Seller
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from django.contrib.auth.models import User


from django.db.models import Q  # ← import Q directly

class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            Q(user=user) | Q(seller=user)  # ← Q not models.Q
        )
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request_user'] = self.request.user
        return context
    
    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        """Get or create a chat room for a property between user and seller"""
        property_id = request.data.get('property_id')
        seller_id = request.data.get('seller_id')
        
        if not property_id or not seller_id:
            return Response(
                {'error': 'property_id and seller_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        seller = get_object_or_404(User, id=seller_id)
        
        # Check if chat room already exists
        chat_room = ChatRoom.objects.filter(
            property_id=property_id,
            user=request.user,
            seller=seller
        ).first()
        
        if not chat_room:
            chat_room = ChatRoom.objects.create(
                property_id=property_id,
                user=request.user,
                seller=seller
            )
        
        serializer = self.get_serializer(chat_room)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in this chat as read for the current user"""
        chat_room = self.get_object()
        Message.objects.filter(
            chat_room=chat_room
        ).exclude(
            sender=request.user
        ).update(is_read=True)
        
        return Response({'status': 'messages marked as read'})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        chat_room_id = self.request.query_params.get('chat_room')
        if chat_room_id:
            return Message.objects.filter(chat_room_id=chat_room_id)
        return Message.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_seller_info(request, seller_id):
    """Get seller contact information"""
    seller = get_object_or_404(User, id=seller_id)
    
    # You might want to get this from a Seller model instead
    seller_profile = {
        'id': seller.id,
        'name': f"{seller.first_name} {seller.last_name}",
        'username': seller.username,
        'email': seller.email,
        # Add phone number if you have it in your Seller model
        # 'phone': seller.seller_profile.phone,
    }
    
    return Response(seller_profile)


class GetOrCreateChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        property_id = request.data.get("property_id")
        seller_id = request.data.get("seller_id")

        if not property_id or not seller_id:
            return Response({"error": "Missing data"}, status=400)

        try:
            seller_obj = Seller.objects.get(id=seller_id)
        except Seller.DoesNotExist:
            return Response({"error": "Seller not found"}, status=404)

        chat_room, created = ChatRoom.objects.get_or_create(
            property_id=property_id,
            user=request.user,
            seller=seller_obj.user
        )

        # ✅ Pass request in context so serializer can resolve other_user
        serializer = ChatRoomSerializer(
            chat_room,
            context={'request': request}  # ← add this
        )
        return Response(serializer.data, status=status.HTTP_200_OK)