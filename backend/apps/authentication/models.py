from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        WORKER = 'worker', 'Worker'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.WORKER)
    phone = models.CharField(max_length=30, blank=True, default='')

    def __str__(self) -> str:  # pragma: no cover
        return f'{self.username} ({self.role})'
