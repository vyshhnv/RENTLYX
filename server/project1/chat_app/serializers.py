
from rest_framework import serializers
from .models import ChatRoom, Message
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'chat_room', 'sender', 'sender_name', 'content', 'timestamp', 'is_read']
        read_only_fields = ['timestamp']


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'property_id', 'user', 'seller', 'created_at', 'updated_at', 
                  'last_message', 'unread_count', 'other_user']
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'content': last_msg.content,
                'timestamp': last_msg.timestamp,
                'sender': last_msg.sender.username
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        request_user = self.context.get('request_user') or (request.user if request else None)
        if request_user and request_user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request_user).count()
        return 0

    def get_other_user(self, obj):
        request = self.context.get('request')
        request_user = self.context.get('request_user') or (request.user if request else None)
        if request_user and request_user.is_authenticated:
            other = obj.seller if request_user == obj.user else obj.user
            return UserSerializer(other).data
        return None