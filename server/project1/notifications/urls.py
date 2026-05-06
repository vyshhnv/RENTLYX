from django.urls import path
from . import views

urlpatterns = [
    path('',                        views.NotificationListView.as_view(),        name='notification_list'),
    path('unread-count/',           views.NotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('mark-all-read/',          views.NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('<int:pk>/read/',          views.NotificationMarkReadView.as_view(),    name='notification_mark_read'),
    path('<int:pk>/delete/',        views.NotificationDeleteView.as_view(),      name='notification_delete'),
]