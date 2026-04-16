from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from workers.models import User, WorkerProfile
from workers.serializers import RegisterSerializer, UserSerializer

import re
import time

# Simulated platform worker ID prefixes for each platform
PLATFORM_ID_PATTERNS = {
    'SWIGGY':        r'^SW-?\d{6,}$',
    'ZOMATO':        r'^ZM-?\d{5,}$',
    'AMAZON_FLEX':   r'^AF-?[A-Z0-9]{6,}$',
    'BLINKIT':       r'^BL-?\d{5,}$',
    'FLIPKART':      r'^FK-?\d{6,}$',
    'DUNZO':         r'^DZ-?\d{5,}$',
    'PORTER':        r'^PR-?\d{5,}$',
    'ZEPTO':         r'^ZP-?\d{5,}$',
    'BIGBASKET':     r'^BB-?\d{5,}$',
    'SHADOWFAX':     r'^SFX-?\d{5,}$',
    'ECOM_EXPRESS':  r'^EE-?\d{5,}$',
    'DELHIVERY':     r'^DL-?\d{6,}$',
}

# Human-readable example IDs shown in error messages
PLATFORM_EXAMPLES = {
    'SWIGGY':        'SW-123456',
    'ZOMATO':        'ZM-12345',
    'AMAZON_FLEX':   'AF-AB1234',
    'BLINKIT':       'BL-12345',
    'FLIPKART':      'FK-123456',
    'DUNZO':         'DZ-12345',
    'PORTER':        'PR-12345',
    'ZEPTO':         'ZP-12345',
    'BIGBASKET':     'BB-12345',
    'SHADOWFAX':     'SFX-12345',
    'ECOM_EXPRESS':  'EE-12345',
    'DELHIVERY':     'DL-123456',
}


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer


class VerifyWorkerView(APIView):
    """Simulated rider/worker identity verification (Test Mode).
    Checks aadhaar last 4 digits format + platform worker ID pattern.
    In production this would call DigiLocker/UIDAI/platform APIs.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        platform = (request.data.get('platform') or '').upper()
        worker_id = (request.data.get('worker_id') or '').strip()
        aadhaar_last4 = (request.data.get('aadhaar_last4') or '').strip()
        username = (request.data.get('username') or '').strip()

        errors = {}

        # Validate Aadhaar last 4 digits
        if not re.fullmatch(r'\d{4}', aadhaar_last4):
            errors['aadhaar_last4'] = 'Must be exactly 4 digits'

        # Validate platform worker ID
        pattern = PLATFORM_ID_PATTERNS.get(platform)
        if not worker_id:
            errors['worker_id'] = 'Worker ID is required'
        elif pattern and not re.match(pattern, worker_id, re.IGNORECASE):
            platform_label = platform.replace('_', ' ').title()
            example = PLATFORM_EXAMPLES.get(platform, 'XX-123456')
            errors['worker_id'] = f'Invalid {platform_label} Partner ID. Example format: {example}'

        if errors:
            return Response({'verified': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        # Simulate network latency of verification service
        time.sleep(0.8)

        # If user already registered, update their profile
        user = User.objects.filter(username=username).first()
        if user:
            profile, _ = WorkerProfile.objects.get_or_create(user=user)
            profile.platform_worker_id = worker_id
            profile.aadhaar_last4 = aadhaar_last4
            profile.is_verified = True
            profile.verification_method = f'{platform}_ID+AADHAAR'
            profile.save(update_fields=['platform_worker_id', 'aadhaar_last4', 'is_verified', 'verification_method'])

        return Response({
            'verified': True,
            'worker_id': worker_id,
            'platform': platform,
            'message': f'✅ Identity verified via {platform.replace("_", " ").title()} Partner ID + Aadhaar last 4 digits (Simulated)',
            'verification_token': f'VT_{worker_id}_{aadhaar_last4}'
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class EnsureProfileMixin:
    def ensure_profile(self, user):
        WorkerProfile.objects.get_or_create(
            user=user,
            defaults={"city_zone": f"{user.city} {user.zone}".strip()},
        )


class CustomTokenView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        if resp.status_code == 200 and request.data.get("username"):
            try:
                u = User.objects.get(username=request.data["username"])
                data = dict(resp.data)
                data["user"] = UserSerializer(u).data
                return Response(data, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                pass
        return resp
