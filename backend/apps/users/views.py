from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserAuthSerializer, UserDetailSerializer

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
        if self.action in ['login', 'register']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        Login or register endpoint
        - First time: creates user and returns JWT
        - Subsequent times: validates password and returns JWT

        POST /api/v1/auth/login/
        """
        serializer = UserAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Check if user exists
        try:
            user = User.objects.get(email=email)
            # User exists - verify password
            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            is_new_user = False
        except User.DoesNotExist:
            # First time login - create new user
            netid = email.split('@')[0]  # Extract netid from email
            user = User.objects.create_user(
                email=email,
                password=password,
                netid=netid
            )
            is_new_user = True

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': UserDetailSerializer(user).data,
            'is_new_user': is_new_user,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get current authenticated user's details

        GET /api/v1/auth/me/
        """
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
