from rest_framework import serializers

from .models import WorkerProfile


class WorkerProfileSerializer(serializers.ModelSerializer):
    hourly_earnings = serializers.FloatField(read_only=True)

    class Meta:
        model = WorkerProfile
        fields = (
            'id',
            'platform_name',
            'city',
            'primary_zone',
            'secondary_zone',
            'avg_weekly_income',
            'avg_weekly_hours',
            'preferred_work_start',
            'preferred_work_end',
            'payout_method',
            'device_id',
            'hourly_earnings',
            'created_at',
        )

