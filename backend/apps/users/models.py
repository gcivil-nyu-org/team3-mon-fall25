from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.
class User(models.Model):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    netid = models.CharField(max_length=255)