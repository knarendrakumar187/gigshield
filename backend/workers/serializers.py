from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from workers.models import User, WorkerProfile


class WorkerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerProfile
        exclude = ("kyc_document_hash", "device_fingerprint_hash")


class UserSerializer(serializers.ModelSerializer):
    worker_profile = WorkerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "city",
            "zone",
            "platform",
            "avg_daily_earnings",
            "upi_id",
            "joined_date",
            "worker_profile",
        )
        read_only_fields = ("id", "joined_date", "role")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "email", "password", "phone", "city", "zone", "platform", "avg_daily_earnings", "upi_id")

    def create(self, validated):
        pw = validated.pop("password")
        # Django password validators raise `django.core.exceptions.ValidationError`.
        # Convert to DRF `serializers.ValidationError` so the API returns 400 + JSON.
        try:
            validate_password(pw)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": e.messages})
        user = User(**validated, role=User.Role.WORKER)
        user.set_password(pw)
        user.save()
        WorkerProfile.objects.get_or_create(
            user=user,
            defaults={"city_zone": f"{user.city} {user.zone}".strip(), "active_since": user.joined_date.date()},
        )
        return user
