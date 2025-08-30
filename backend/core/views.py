from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.contrib.auth import get_user_model, authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Post, Comment, Like, Save
from .serializers import (
    PostSerializer, CreatePostSerializer, 
    CommentSerializer, CreateCommentSerializer
)

User = get_user_model()


class PostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling post operations.
    Supports CRUD operations and like/save toggle actions.
    """
    queryset = Post.objects.all().order_by('-created_at')
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return CreatePostSerializer
        return PostSerializer

    def get_permissions(self):
        """
        Set permissions based on action.
        Allow list/retrieve for any user, require auth for create/update/delete.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        Set the user when creating a post.
        """
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """
        Only allow users to delete their own posts.
        """
        if instance.user != self.request.user:
            return Response(
                {'error': 'You can only delete your own posts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        """
        Toggle like for a post.
        Returns the current like count and liked status.
        """
        post = self.get_object()
        user = request.user
        
        try:
            with transaction.atomic():
                like_obj, created = Like.objects.get_or_create(
                    user=user, 
                    post=post
                )
                
                if not created:
                    # Unlike the post
                    like_obj.delete()
                    liked = False
                else:
                    # Like the post
                    liked = True
                
                # Get updated like count
                like_count = post.likes.count()
                
                return Response({
                    'likes': like_count,
                    'liked': liked,
                    'message': 'Post liked' if liked else 'Post unliked'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'error': 'An error occurred while processing your request.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        """
        Toggle save for a post.
        Returns the current saved status.
        """
        post = self.get_object()
        user = request.user
        
        try:
            with transaction.atomic():
                save_obj, created = Save.objects.get_or_create(
                    user=user, 
                    post=post
                )
                
                if not created:
                    # Unsave the post
                    save_obj.delete()
                    saved = False
                else:
                    # Save the post
                    saved = True
                
                return Response({
                    'saved': saved,
                    'message': 'Post saved' if saved else 'Post unsaved'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'error': 'An error occurred while processing your request.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Get all comments for a specific post.
        """
        post = self.get_object()
        comments = Comment.objects.filter(post=post).order_by('-created_at')
        
        serializer = CommentSerializer(
            comments, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'count': comments.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling comment operations.
    Supports creating, listing, and deleting comments.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """
        Filter comments by post if post_id is provided in URL.
        """
        queryset = Comment.objects.all().order_by('-created_at')
        post_id = self.request.query_params.get('post_id', None)
        
        if post_id is not None:
            queryset = queryset.filter(post_id=post_id)
            
        return queryset

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return CreateCommentSerializer
        return CommentSerializer

    def perform_create(self, serializer):
        """
        Set the user when creating a comment.
        """
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """
        Only allow users to delete their own comments or post owners to delete comments on their posts.
        """
        user = self.request.user
        
        if instance.user != user and instance.post.user != user:
            return Response(
                {'error': 'You can only delete your own comments or comments on your posts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()

    def create(self, request, *args, **kwargs):
        """
        Create a new comment with proper validation.
        """
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Validate that the post exists
            post_id = serializer.validated_data.get('post')
            try:
                post = Post.objects.get(id=post_id.id)
            except Post.DoesNotExist:
                return Response(
                    {'error': 'Post does not exist.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create the comment
            comment = serializer.save(user=request.user)
            
            # Return the created comment with full details
            response_serializer = CommentSerializer(
                comment, 
                context={'request': request}
            )
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def list(self, request, *args, **kwargs):
        """
        List comments with optional post filtering.
        """
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def by_post(self, request):
        """
        Get comments for a specific post.
        Usage: /api/comments/by_post/?post_id=123
        """
        post_id = request.query_params.get('post_id')
        
        if not post_id:
            return Response(
                {'error': 'post_id parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post does not exist.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        comments = Comment.objects.filter(post=post).order_by('-created_at')
        serializer = self.get_serializer(comments, many=True)
        
        return Response({
            'post_id': post_id,
            'count': comments.count(),
            'results': serializer.data
        })


# Helper function to get user from request (can be expanded for different auth methods)
def get_user_from_request(request):
    """
    Helper function to get user from request.
    Can be extended to handle different authentication methods.
    """
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


# Additional utility views for common operations
class PostStatsView(viewsets.ViewSet):
    """
    ViewSet for getting post statistics.
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get overall post statistics.
        """
        total_posts = Post.objects.count()
        total_likes = Like.objects.count()
        total_comments = Comment.objects.count()
        total_saves = Save.objects.count()

        return Response({
            'total_posts': total_posts,
            'total_likes': total_likes,
            'total_comments': total_comments,
            'total_saves': total_saves
        })

    @action(detail=True, methods=['get'])
    def post_stats(self, request, pk=None):
        """
        Get statistics for a specific post.
        """
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        like_count = post.likes.count()
        comment_count = post.comments.count()
        save_count = post.saves.count()

        # Check if current user has interacted with this post
        user_stats = {}
        if request.user.is_authenticated:
            user_stats = {
                'is_liked': Like.objects.filter(user=request.user, post=post).exists(),
                'is_saved': Save.objects.filter(user=request.user, post=post).exists(),
                'has_commented': Comment.objects.filter(user=request.user, post=post).exists()
            }

        return Response({
            'post_id': post.id,
            'like_count': like_count,
            'comment_count': comment_count,
            'save_count': save_count,
            'user_interactions': user_stats
        })


class LoginView(APIView):
    """
    Login view that returns a token for authentication.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'email': user.email
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class RegisterView(APIView):
    """
    Register view for creating new users.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not username or not email or not password:
            return Response(
                {'error': 'Username, email, and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            
            return Response({
                'message': 'User created successfully.',
                'user_id': user.id,
                'username': user.username,
                'email': user.email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to create user.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogoutView(APIView):
    """
    Logout view that deletes the user's token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Delete the user's token
            Token.objects.filter(user=request.user).delete()
            return Response(
                {'message': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to logout.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CurrentUserView(APIView):
    """
    Get current user profile information.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'bio': user.bio,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'points': user.points,
            'bugs_solved': user.bugs_solved,
            'followers_count': user.followers.count(),
            'following_count': user.following.count(),
            'posts_count': user.posts.count(),
            'created_at': user.created_at
        }, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """
        Update current user profile.
        """
        user = request.user
        
        # Update allowed fields
        if 'bio' in request.data:
            user.bio = request.data['bio']
        
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
        
        user.save()
        
        return Response({
            'message': 'Profile updated successfully.',
            'bio': user.bio,
            'profile_picture': user.profile_picture.url if user.profile_picture else None
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """
    Get user profile by username.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
            return Response({
                'id': user.id,
                'username': user.username,
                'bio': user.bio,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'points': user.points,
                'bugs_solved': user.bugs_solved,
                'followers_count': user.followers.count(),
                'following_count': user.following.count(),
                'posts_count': user.posts.count(),
                'created_at': user.created_at
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserSearchView(APIView):
    """
    Search users by username.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        search_query = request.query_params.get('search', '')
        
        if not search_query:
            return Response(
                {'results': []},
                status=status.HTTP_200_OK
            )
        
        users = User.objects.filter(
            username__icontains=search_query
        ).exclude(id=request.user.id if request.user.is_authenticated else None)[:10]
        
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'bio': user.bio,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'followers_count': user.followers.count(),
                'is_following': False  # TODO: Implement follow check
            })
        
        return Response({
            'results': results,
            'count': len(results)
        }, status=status.HTTP_200_OK)
