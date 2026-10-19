from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile

User = get_user_model()


# The API name field holds a chosen display name, not a legal name.
def account(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return {"id": user.pk, "email": user.email, "name": user.first_name, "hometown": profile.hometown}


def session(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": account(user)}


class Credentials(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(trim_whitespace=False, max_length=128)


class Registration(Credentials):
    name = serializers.CharField(max_length=150)
    hometown = serializers.CharField(max_length=150)

    def validate(self, data):
        data["email"] = data["email"].lower()
        user = User(username=data["email"], email=data["email"], first_name=data["name"])
        try:
            validate_password(data["password"], user)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        return data


class PublicAuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]


class RegisterView(PublicAuthView):
    def post(self, request):
        serializer = Registration(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            with transaction.atomic():
                if User.objects.filter(email__iexact=data["email"]).exists():
                    raise IntegrityError
                user = User.objects.create_user(username=data["email"], email=data["email"],
                                                password=data["password"], first_name=data["name"])
                Profile.objects.create(user=user, hometown=data["hometown"])
        except IntegrityError:
            return Response({"detail": "An account with this email already exists."}, status=400)
        return Response(session(user), status=status.HTTP_201_CREATED)


class SignInView(PublicAuthView):
    def post(self, request):
        serializer = Credentials(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = authenticate(request, username=data["email"].lower(), password=data["password"])
        if user is None:
            return Response({"detail": "Email or password is incorrect."}, status=401)
        return Response(session(user))


class AccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(account(request.user))

    def patch(self, request):
        serializer = serializers.Serializer(data=request.data)
        serializer.fields["name"] = serializers.CharField(max_length=150, required=False)
        serializer.fields["hometown"] = serializers.CharField(max_length=150, required=False)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if "name" in serializer.validated_data:
                request.user.first_name = serializer.validated_data["name"]
                request.user.save(update_fields=["first_name"])
            if "hometown" in serializer.validated_data:
                Profile.objects.update_or_create(user=request.user, defaults={"hometown": serializer.validated_data["hometown"]})
        return Response(account(request.user))
