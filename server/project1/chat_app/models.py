from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class ChatRoom(models.Model):
    """Represents a conversation between a user and seller about a property"""
    property_id = models.IntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_chats')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_chats')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['property_id', 'user', 'seller']
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Chat: Property {self.property_id} - {self.user.username} & {self.seller.username}"


class Message(models.Model):
    """Individual message in a chat room"""
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"