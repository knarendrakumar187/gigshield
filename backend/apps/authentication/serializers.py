from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.workers.models import WorkerProfile
import random

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.WORKER)
    email = serializers.EmailField(required=True)
    
    # Worker Profile Fields
    city = serializers.CharField(write_only=True, required=False)
    platform = serializers.CharField(write_only=True, required=False)
    zone = serializers.CharField(write_only=True, required=False)
    income = serializers.IntegerField(write_only=True, required=False)
    hours = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'role', 'password', 'first_name', 'last_name', 
                  'city', 'platform', 'zone', 'income', 'hours')
        extra_kwargs = {
            'username': {'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        
        city = validated_data.pop('city', 'Hyderabad')
        platform = validated_data.pop('platform', 'Swiggy')
        zone = validated_data.pop('zone', 'Madhapur')
        income = validated_data.pop('income', 8000)
        hours = validated_data.pop('hours', 40)
        
        email = validated_data.get('email')
        if not validated_data.get('username') and email:
            validated_data['username'] = email.split('@')[0] + str(random.randint(100, 9999))

        user = User(**validated_data)
        if user.role == User.Role.ADMIN:
            user.is_staff = True
        user.set_password(password)
        user.save()
        
        if user.role == User.Role.WORKER:
            WorkerProfile.objects.create(
                user=user,
                city=city,
                platform_name=platform,
                primary_zone=zone,
                avg_weekly_income=income,
                avg_weekly_hours=hours,
                preferred_work_start='08:00',
                preferred_work_end='22:00'
            )
            
        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'role', 'first_name', 'last_name')


class TokenSerializer(TokenObtainPairSerializer):
    """
    Hackathon login: accept either 'username' or 'identifier' (email/phone/username).
    """

    identifier = serializers.CharField(required=False, allow_blank=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow frontend to send identifier instead of username.
        username_field = self.username_field
        if username_field in self.fields:
            self.fields[username_field].required = False

    def validate(self, attrs):
        identifier = attrs.get('identifier')
        if identifier:
            from django.contrib.auth import get_user_model
            from django.db.models import Q
            User = get_user_model()
            
            # Resolve identifier (could be email, phone, or pure username) to actual username
            user = User.objects.filter(
                Q(email__iexact=identifier) | 
                Q(username__iexact=identifier) | 
                Q(phone=identifier)
            ).first()
            
            if user:
                attrs['username'] = user.username
            elif not attrs.get('username'):
                attrs['username'] = identifier
                
        return super().validate(attrs)
