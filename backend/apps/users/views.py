import logging

from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models_otp import OTPAttempt
from .otp_service import (
    generate_otp,
    store_otp,
    send_otp_email,
    verify_otp,
    log_otp_action,
    get_client_ip,
    get_user_agent,
    delete_otp,
)
from .serializers import (
    UserAuthSerializer,
    UserDetailSerializer,
    OTPVerificationSerializer,
    SendOTPSerializer,
)
from .throttles import OTPRateThrottle

logger = logging.getLogger(__name__)

User = get_user_model()


class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet for authentication operations.
    Follows the same pattern as ListingViewSet.
    """

    queryset = User.objects.all()
    serializer_class = UserAuthSerializer

    def get_permissions(self):
        """
        Set permissions based on action.
        """
        if self.action in [
            "login",
            "register",
            "verify_otp",
            "send_otp",
            "resend_otp",
        ]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_throttles(self):
        """
        Apply rate limiting to OTP endpoints.
        """
        if self.action in ["register", "send_otp", "resend_otp"]:
            return [OTPRateThrottle()]
        return super().get_throttles()

    def _check_account_blocked(self, email):
        """
        Check if account is blocked due to too many failed attempts.
        Returns (is_blocked, attempt_obj) tuple.
        """
        attempt, _ = OTPAttempt.objects.get_or_create(email=email)
        if attempt.is_currently_blocked():
            return True, attempt
        return False, attempt

    def _send_otp_to_user(self, email, request):
        """
        Helper method to generate and send OTP with audit logging.
        """
        otp = generate_otp()
        store_otp(email, otp)
        email_sent = send_otp_email(email, otp, request)

        ip_address = get_client_ip(request) if request else None
        user_agent = get_user_agent(request) if request else ""

        if email_sent:
            log_otp_action(
                email=email,
                action="generate",
                success=True,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            logger.info(f"OTP sent successfully to {email}")
            return True
        else:
            log_otp_action(
                email=email,
                action="generate",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message="Failed to send email",
            )
            logger.error(f"Failed to send OTP to {email}")
            return False

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        throttle_classes=[OTPRateThrottle],
    )
    def register(self, request):
        """
        Register new user and send OTP email

        POST /api/v1/auth/register/
        Body: { "email": "user@nyu.edu", "password": "password123" }
        """
        serializer = UserAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            error_msg = "User with this email already exists. " "Please login instead."
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if account is blocked
        is_blocked, attempt = self._check_account_blocked(email)
        if is_blocked:
            error_msg = (
                "Account is temporarily blocked due to too many "
                "failed verification attempts. Please contact support "
                "or try again later."
            )
            return Response(
                {"error": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Create new user with is_email_verified=False
        netid = email.split("@")[0]  # Extract netid from email
        user = User.objects.create_user(
            email=email,
            password=password,
            netid=netid,
            is_email_verified=False,
        )

        # Generate and send OTP
        email_sent = self._send_otp_to_user(email, request)

        if not email_sent:
            # If email sending fails, delete the user and return error
            user.delete()
            error_msg = "Failed to send verification email. Please try again."
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        msg = (
            "Registration successful. "
            "Please check your email for the verification code."
        )
        return Response(
            {
                "message": msg,
                "user_id": user.user_id,
                "email": email,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="verify-otp",
    )
    def verify_otp(self, request):
        """
        Verify OTP and activate user account

        POST /api/v1/auth/verify-otp/
        Body: { "email": "user@nyu.edu", "otp": "123456" }
        """
        serializer = OTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        provided_otp = serializer.validated_data["otp"]

        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)

        # Check if account is blocked
        is_blocked, attempt = self._check_account_blocked(email)
        if is_blocked:
            log_otp_action(
                email=email,
                action="verify",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message="Account blocked",
            )
            error_msg = (
                "Account is temporarily blocked due to too many "
                "failed verification attempts. Please contact support."
            )
            return Response(
                {"error": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            log_otp_action(
                email=email,
                action="verify",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message="User not found",
            )
            return Response(
                {"error": "User not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verify OTP
        if not verify_otp(email, provided_otp):
            # Increment failed attempt
            attempt.increment_attempt()
            log_otp_action(
                email=email,
                action="verify_failed",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message="Invalid or expired OTP",
            )

            # Check if account should be blocked
            if attempt.attempts_count >= 5:
                user.is_active = False
                user.save()
                log_otp_action(
                    email=email,
                    action="block",
                    success=True,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                error_msg = (
                    "Too many failed attempts. "
                    "Your account has been blocked. "
                    "Please contact support."
                )
                return Response(
                    {"error": error_msg},
                    status=status.HTTP_403_FORBIDDEN,
                )

            error_msg = "Invalid or expired OTP. Please request a new one."
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # OTP verified successfully - reset attempts
        attempt.reset_attempts()

        # Mark email as verified
        user.is_email_verified = True
        user.save()

        log_otp_action(
            email=email,
            action="verify",
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        logger.info(f"Email verified for user: {email}")

        return Response(
            {
                "message": "Email verified successfully",
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
                "user": UserDetailSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="send-otp",
        throttle_classes=[OTPRateThrottle],
    )
    def send_otp(self, request):
        """
        Send OTP to existing user

        POST /api/v1/auth/send-otp/
        Body: { "email": "user@nyu.edu" }
        """
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        # Check if account is blocked
        is_blocked, _ = self._check_account_blocked(email)
        if is_blocked:
            error_msg = (
                "Account is temporarily blocked. "
                "Please contact support or try again later."
            )
            return Response(
                {"error": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if user exists
        if not User.objects.filter(email=email).exists():
            return Response(
                {"error": "User not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Send OTP
        email_sent = self._send_otp_to_user(email, request)

        if not email_sent:
            error_msg = "Failed to send verification email. Please try again."
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": (
                    "Verification code sent successfully. " "Please check your email."
                ),
                "email": email,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="resend-otp",
        throttle_classes=[OTPRateThrottle],
    )
    def resend_otp(self, request):
        """
        Resend OTP (invalidates previous OTP)

        POST /api/v1/auth/resend-otp/
        Body: { "email": "user@nyu.edu" }
        """
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        # Check if account is blocked
        is_blocked, _ = self._check_account_blocked(email)
        if is_blocked:
            error_msg = (
                "Account is temporarily blocked. "
                "Please contact support or try again later."
            )
            return Response(
                {"error": error_msg},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if user exists
        if not User.objects.filter(email=email).exists():
            return Response(
                {"error": "User not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Invalidate previous OTP
        delete_otp(email)

        # Send new OTP
        email_sent = self._send_otp_to_user(email, request)

        if not email_sent:
            error_msg = "Failed to send verification email. Please try again."
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": (
                    "New verification code sent successfully. "
                    "Please check your email."
                ),
                "email": email,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def login(self, request):
        """
        Login endpoint
        - If user is verified: returns JWT tokens
        - If user exists but not verified: returns error (must verify first)
        - If user doesn't exist: returns error (should use register endpoint)

        POST /api/v1/auth/login/
        """
        serializer = UserAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Check if user exists
        try:
            user = User.objects.get(email=email)

            # Check if account is active
            if not user.is_active:
                return Response(
                    {"error": ("Account is blocked. " "Please contact support.")},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # User exists - verify password
            if not user.check_password(password):
                return Response(
                    {"error": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check if email is verified - completely block unverified users
            if not user.is_email_verified:
                error_msg = (
                    "Email not verified. Please verify your email "
                    "using the OTP sent to your email. "
                    "Use /api/v1/auth/send-otp/ to request a new code."
                )
                return Response(
                    {
                        "error": error_msg,
                        "requires_verification": True,
                        "email": email,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # User is verified - generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "access_token": str(refresh.access_token),
                    "refresh_token": str(refresh),
                    "user": UserDetailSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            # User doesn't exist - redirect to register
            return Response(
                {
                    "error": "User not found. Please register first.",
                    "requires_registration": True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
    )
    def me(self, request):
        """
        Get current authenticated user's details

        GET /api/v1/auth/me/
        """
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
