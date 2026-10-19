from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView
from .views import AccountView, RegisterView, SignInView

from .social import SocialStartView, SocialCallbackView, SocialResultView

urlpatterns = [
    path("social/result/", SocialResultView.as_view()),
    path("social/<str:provider>/start/", SocialStartView.as_view()),
    path("social/<str:provider>/callback/", SocialCallbackView.as_view()),
    path("register/", RegisterView.as_view()),
    path("sign-in/", SignInView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("sign-out/", TokenBlacklistView.as_view()),
    path("me/", AccountView.as_view()),
]
