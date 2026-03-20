from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import ProfileSerializer, RegisterSerializer, TokenSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TokenSerializer


class ProfileView(generics.GenericAPIView):
    serializer_class = ProfileSerializer

    def get(self, request, *args, **kwargs):
        return Response(self.get_serializer(request.user).data)
from django.shortcuts import render

# Create your views here.
