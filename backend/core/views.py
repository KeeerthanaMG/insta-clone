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
from django.db.models import Q

from .models import (
    Post, Comment, Like, Save, Follow, Notification,
    ChatThread, ChatMessage
)
from .serializers import (
    PostSerializer, CreatePostSerializer, 
    CommentSerializer, CreateCommentSerializer,
    NotificationSerializer, ChatThreadSerializer, ChatMessageSerializer
)

User = get_user_model()


def create_notification(receiver, sender, notification_type, post=None, comment=None):
    """
    Helper function to create notifications.
    Prevents creating notifications for self-actions.
    """
    if receiver != sender:
        try:
            notification, created = Notification.objects.get_or_create(
                sender=sender,
                receiver=receiver,
                notification_type=notification_type,
                post=post,
                comment=comment,
                defaults={'is_read': False}
            )
            return notification
        except Exception as e:
            # Log error but don't break the main action
            print(f"Error creating notification: {e}")
    return None


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
                    # Remove notification if exists
                    Notification.objects.filter(
                        sender=user,
                        receiver=post.user,
                        notification_type='like',
                        post=post
                    ).delete()
                else:
                    # Like the post
                    liked = True
                    # Create notification
                    create_notification(
                        receiver=post.user,
                        sender=user,
                        notification_type='like',
                        post=post
                    )
                
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
            
            # Create notification for post owner
            create_notification(
                receiver=post.user,
                sender=request.user,
                notification_type='comment',
                post=post,
                comment=comment
            )
            
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
            
            # Check if current user is following this user
            is_following = False
            if request.user.is_authenticated and request.user != user:
                is_following = Follow.objects.filter(
                    follower=request.user,
                    following=user
                ).exists()
            
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
                'created_at': user.created_at,
                'is_following': is_following
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
            is_following = False
            if request.user.is_authenticated:
                is_following = Follow.objects.filter(
                    follower=request.user, 
                    following=user
                ).exists()
            
            results.append({
                'id': user.id,
                'username': user.username,
                'bio': user.bio,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'followers_count': user.followers.count(),
                'following_count': user.following.count(),
                'is_following': is_following
            })
        
        return Response({
            'results': results,
            'count': len(results)
        }, status=status.HTTP_200_OK)


class FollowUserView(APIView):
    """
    Follow a user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if target_user == request.user:
            return Response(
                {'error': 'You cannot follow yourself.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        follow_obj, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user
        )
        
        if created:
            # Create notification for followed user
            create_notification(
                receiver=target_user,
                sender=request.user,
                notification_type='follow'
            )
            message = f'You are now following {target_user.username}'
            is_following = True
        else:
            message = f'You are already following {target_user.username}'
            is_following = True
        
        return Response({
            'message': message,
            'is_following': is_following,
            'followers_count': target_user.followers.count(),
            'following_count': request.user.following.count()
        }, status=status.HTTP_200_OK)


class UnfollowUserView(APIView):
    """
    Unfollow a user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if target_user == request.user:
            return Response(
                {'error': 'You cannot unfollow yourself.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            follow_obj = Follow.objects.get(
                follower=request.user,
                following=target_user
            )
            follow_obj.delete()
            
            # Remove follow notification
            Notification.objects.filter(
                sender=request.user,
                receiver=target_user,
                notification_type='follow'
            ).delete()

            message = f'You have unfollowed {target_user.username}'
            is_following = False
        except Follow.DoesNotExist:
            message = f'You are not following {target_user.username}'
            is_following = False
        
        return Response({
            'message': message,
            'is_following': is_following,
            'followers_count': target_user.followers.count(),
            'following_count': request.user.following.count()
        }, status=status.HTTP_200_OK)


class NotificationListView(APIView):
    """
    List notifications for the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get all notifications for the user first
        all_notifications = Notification.objects.filter(
            receiver=request.user
        ).order_by('-is_read', '-created_at')
        
        # Calculate unread count before slicing
        unread_count = all_notifications.filter(is_read=False).count()
        
        # Then limit to 50 most recent
        notifications = all_notifications[:50]
        
        serializer = NotificationSerializer(
            notifications, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'results': serializer.data,
            'unread_count': unread_count,
            'count': all_notifications.count()
        }, status=status.HTTP_200_OK)


class NotificationReadView(APIView):
    """
    Mark a notification as read.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                receiver=request.user
            )
            notification.is_read = True
            notification.save()
            
            return Response({
                'message': 'Notification marked as read.'
            }, status=status.HTTP_200_OK)
            
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationMarkAllReadView(APIView):
    """
    Mark all notifications as read.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        updated_count = Notification.objects.filter(
            receiver=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': f'{updated_count} notifications marked as read.',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)


class FeedView(APIView):
    """
    Get posts from followed users only.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get users that the current user follows
        following_users = request.user.following.values_list('following', flat=True)
        
        if not following_users:
            return Response({
                'results': [],
                'count': 0,
                'message': 'Follow some users to see their posts in your feed!'
            }, status=status.HTTP_200_OK)
        
        # Get posts from followed users
        posts = Post.objects.filter(
            user__in=following_users
        ).order_by('-created_at')
        
        # Serialize posts with context
        serializer = PostSerializer(
            posts, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'results': serializer.data,
            'count': posts.count()
        }, status=status.HTTP_200_OK)


class UserPostsView(APIView):
    """
    Get posts by a specific user.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get posts by this user
        posts = Post.objects.filter(
            user=user
        ).order_by('-created_at')
        
        # Serialize posts with context
        serializer = PostSerializer(
            posts, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'results': serializer.data,
            'count': posts.count(),
            'user': {
                'id': user.id,
                'username': user.username,
                'profile_picture': user.profile_picture.url if user.profile_picture else None
            }
        }, status=status.HTTP_200_OK)


class ThreadListView(APIView):
    """
    List chat threads for the current user.
    Separates into 'inbox' (accepted) and 'requests' (pending).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        threads = ChatThread.objects.filter(participants=user)
        
        inbox_threads = threads.filter(is_accepted=True)
        request_threads = threads.filter(is_accepted=False).exclude(messages__sender=user)

        inbox_serializer = ChatThreadSerializer(inbox_threads, many=True, context={'request': request})
        requests_serializer = ChatThreadSerializer(request_threads, many=True, context={'request': request})

        return Response({
            'inbox': inbox_serializer.data,
            'requests': requests_serializer.data
        })


class StartThreadView(APIView):
    """
    Start a new chat thread with another user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        if not receiver_id:
            return Response({'error': 'Receiver ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        sender = request.user
        if sender == receiver:
            return Response({'error': 'You cannot start a chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a thread already exists
        thread = ChatThread.objects.filter(participants=sender).filter(participants=receiver).first()

        if not thread:
            thread = ChatThread.objects.create()
            thread.participants.add(sender, receiver)
        
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcceptThreadView(APIView):
    """
    Accept a chat request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, thread_id):
        try:
            thread = ChatThread.objects.get(id=thread_id, participants=request.user)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found or you are not a participant.'}, status=status.HTTP_404_NOT_FOUND)

        thread.is_accepted = True
        thread.save()
        return Response({'message': 'Chat request accepted.'}, status=status.HTTP_200_OK)


class MessageListView(APIView):
    """
    List messages in a thread and create new messages.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        try:
            thread = ChatThread.objects.get(id=thread_id, participants=request.user)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found.'}, status=status.HTTP_404_NOT_FOUND)

        messages = thread.messages.all().order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, thread_id):
        try:
            thread = ChatThread.objects.get(id=thread_id, participants=request.user)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not thread.is_accepted:
            # Allow only the person who did not initiate to accept by sending a message
            if thread.messages.exists() and thread.messages.first().sender == request.user:
                 return Response({'error': 'Cannot send message in a pending chat you started.'}, status=status.HTTP_403_FORBIDDEN)
            thread.is_accepted = True
            thread.save()

        serializer = ChatMessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(sender=request.user, thread=thread)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
