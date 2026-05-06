from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    GET  /api/notifications/         — list all notifications for logged-in user
    GET  /api/notifications/?unread=1 — unread only
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        if request.query_params.get('unread') == '1':
            qs = qs.filter(is_read=False)
        serializer = NotificationSerializer(qs[:50], many=True)   # cap at 50
        return Response({
            "count":        qs.count(),
            "unread_count": Notification.objects.filter(user=request.user, is_read=False).count(),
            "notifications": serializer.data,
        })


class NotificationMarkReadView(APIView):
    """
    PATCH /api/notifications/<pk>/read/  — mark single notification as read
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        notif.is_read = True
        notif.save()
        return Response({"message": "Marked as read"})


class NotificationMarkAllReadView(APIView):
    """
    PATCH /api/notifications/mark-all-read/  — mark ALL as read
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read"})


class NotificationUnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/  — lightweight poll for badge
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})


class NotificationDeleteView(APIView):
    """
    DELETE /api/notifications/<pk>/delete/  — delete a single notification
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)