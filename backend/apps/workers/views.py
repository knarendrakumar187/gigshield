from rest_framework import generics

from .models import WorkerProfile
from .serializers import WorkerProfileSerializer


class WorkerProfileUpsertView(generics.CreateAPIView, generics.RetrieveAPIView):
    serializer_class = WorkerProfileSerializer

    def get_object(self):
        return WorkerProfile.objects.get(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

from django.shortcuts import render

# Create your views here.
