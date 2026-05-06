from django.urls import path
from .views import PredictPriceView, GetLocalitiesView, ModelInfoView, ChatHistoryView
from . import views

urlpatterns = [
    path('predict-price/', PredictPriceView.as_view(), name='predict-price'),
    path('chat-history/',  ChatHistoryView.as_view(),  name='chat-history'),
    path('localities/',    GetLocalitiesView.as_view(), name='get-localities'),
    path('model-info/',    ModelInfoView.as_view(),     name='model-info'),
    path('ask/',           views.ask_mistral_api,       name='ask-mistral'),  # ← NEW
]