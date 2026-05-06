from django.urls import path
from . import views

urlpatterns = [
    # Buyer endpoints
    path('submit/',                          views.SubmitReviewView.as_view(),       name='review_submit'),
    path('<int:review_id>/update/',          views.UpdateReviewView.as_view(),       name='review_update'),
    path('property/<int:property_id>/',      views.PropertyReviewsView.as_view(),    name='property_reviews'),
    path('my/',                              views.MyReviewsView.as_view(),          name='my_reviews'),

    # Admin endpoints
    path('admin/all/',                       views.AdminAllReviewsView.as_view(),    name='admin_all_reviews'),
    path('<int:review_id>/delete/',          views.AdminDeleteReviewView.as_view(),  name='admin_delete_review'),
]