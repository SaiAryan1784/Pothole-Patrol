from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    def create_user(self, firebase_uid, email, **extra_fields):
        if not firebase_uid:
            raise ValueError(_('The Firebase UID must be set'))
        if email:
            email = self.normalize_email(email)
        user = self.model(firebase_uid=firebase_uid, email=email, **extra_fields)
        user.save(using=self._db)
        return user

    def create_superuser(self, firebase_uid, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
            
        # Optional: We don't store passwords normally, but superusers might use Django Admin
        user = self.create_user(firebase_uid, email, **extra_fields)
        if password:
            user.set_password(password)
            user.save(using=self._db)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    firebase_uid = models.CharField(max_length=255, unique=True, primary_key=True)
    password = models.CharField(_("password"), max_length=128, null=True, blank=True) # Optional for standard users
    email = models.EmailField(_('email address'), null=True, blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    
    date_joined = models.DateTimeField(_('date joined'), auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'firebase_uid'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.display_name or self.email or self.firebase_uid
