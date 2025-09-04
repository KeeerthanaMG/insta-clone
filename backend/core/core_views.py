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
import logging
from django.core.cache import cache
import time
import base64

logger = logging.getLogger("ctf_debug")

from .models import (
    Post, Comment, Like, Save, Follow, Notification,
    ChatThread, ChatMessage, Bug, BugSolve, Leaderboard
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
            like, created = Like.objects.get_or_create(user=user, post=post)
            
            if not created:
                # Unlike the post
                like.delete()
                liked = False
                message = 'Post unliked successfully.'
            else:
                # Like the post
                liked = True
                message = 'Post liked successfully.'
                
                # Create notification for post owner
                create_notification(
                    receiver=post.user,
                    sender=user,
                    notification_type='like',
                    post=post
                )
            
            return Response({
                'message': message,
                'liked': liked,
                'like_count': post.likes.count()
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'error': 'Failed to toggle like.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        """
        Toggle save for a post.
        Returns the current saved status.
        VULNERABLE: No concurrency control - race condition possible.
        """
        from .ctf_views import trigger_bug_found, SAVE_ATTEMPT_TRACKER
        import time
        
        post = self.get_object()
        user = request.user
        current_time = time.time()
        
        # Track rapid save attempts for race condition detection
        user_attempts = SAVE_ATTEMPT_TRACKER[f"{user.id}_{post.id}"]
        
        # Clean old attempts (older than 5 seconds)
        user_attempts[:] = [attempt_time for attempt_time in user_attempts if current_time - attempt_time < 5.0]
        
        # Add current attempt
        user_attempts.append(current_time)
        
        # Check for race condition (10+ attempts in 5 seconds)
        if len(user_attempts) >= 10:
            # Race condition detected! Trigger CTF bug
            bug_response = trigger_bug_found(
                user=user,
                bug_title="Race Condition in Saved Posts",
                points=50
            )
            
            # Clear the tracker for this user/post combination
            SAVE_ATTEMPT_TRACKER[f"{user.id}_{post.id}"].clear()
            
            if bug_response['success']:
                return Response({
                    'vulnerability_detected': True,
                    'ctf_message': bug_response['message'],
                    'ctf_points_awarded': bug_response['points_awarded'],
                    'ctf_total_points': bug_response['total_points'],
                    'flag': f"CTF{{race_condition_saved_{user.id}_{post.id}}}",
                    'description': 'You discovered a race condition vulnerability! Multiple rapid requests can cause unexpected behavior.',
                    'bug_type': 'Race Condition',
                    'redirect_to': '/profile'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'vulnerability_detected': True,
                    'ctf_message': bug_response['message'],
                    'ctf_points_awarded': 0,
                    'ctf_total_points': bug_response['total_points'],
                    'flag': f"CTF{{race_condition_saved_{user.id}_{post.id}}}",
                    'description': 'You already found this race condition vulnerability.',
                    'bug_type': 'Race Condition',
                    'redirect_to': '/profile'
                }, status=status.HTTP_200_OK)
        
        try:
            # VULNERABLE: No proper concurrency control (no select_for_update, etc.)
            # This intentionally allows race conditions for educational purposes
            save_obj, created = Save.objects.get_or_create(user=user, post=post)
            
            if not created:
                # Unsave the post
                save_obj.delete()
                saved = False
                message = 'Post removed from saved posts.'
            else:
                # Save the post
                saved = True
                message = 'Post saved successfully.'
                
                # Create notification for post owner (if different user)
                if post.user != user:
                    from .ctf_views import create_notification
                    create_notification(
                        receiver=post.user,
                        sender=user,
                        notification_type='save',
                        post=post
                    )
            
            return Response({
                'message': message,
                'saved': saved,
                'save_count': post.saves.count()
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'error': 'Failed to toggle save.'},
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
        Create a new comment with XSS detection and proper validation.
        """
        from .ctf_views import trigger_bug_found, detect_xss_attempt, sanitize_comment_text
        
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            comment_text = serializer.validated_data.get('text', '')
            
            # Check for XSS attempts BEFORE creating the comment
            if detect_xss_attempt(comment_text):
                # XSS attempt detected! Trigger CTF bug detection
                bug_response = trigger_bug_found(
                    user=request.user,
                    bug_title="XSS in Comment System",
                    points=75
                )
                
                if bug_response['success']:
                    # First time finding this bug - return CTF response
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{xss_comment_system_{request.user.id}}}",
                        'description': 'You discovered an XSS vulnerability in the comment system! The malicious script was detected and neutralized.',
                        'bug_type': 'Cross-Site Scripting (XSS)',
                        'attempted_payload': comment_text[:100] + '...' if len(comment_text) > 100 else comment_text
                    }, status=status.HTTP_200_OK)
                else:
                    # Already found this bug
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': 0,
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{xss_comment_system_{request.user.id}}}",
                        'description': 'XSS attempt detected, but you already found this vulnerability.',
                        'bug_type': 'Cross-Site Scripting (XSS)',
                        'attempted_payload': comment_text[:100] + '...' if len(comment_text) > 100 else comment_text
                    }, status=status.HTTP_200_OK)
            
            # Sanitize the comment text to prevent actual XSS execution
            sanitized_text = sanitize_comment_text(comment_text)
            serializer.validated_data['text'] = sanitized_text
            
            # Validate that the post exists
            post_id = serializer.validated_data.get('post')
            try:
                post = Post.objects.get(id=post_id.id)
            except Post.DoesNotExist:
                return Response(
                    {'error': 'Post not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create the comment with sanitized content
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
                {'error': 'Post not found.'},
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
            post = Post.objects.get(id=pk)
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
                'liked': post.likes.filter(user=request.user).exists(),
                'saved': post.saves.filter(user=request.user).exists(),
                'commented': post.comments.filter(user=request.user).exists()
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
    VULNERABLE: No rate limiting - susceptible to brute-force attacks.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        from .ctf_views import trigger_bug_found
        
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get client IP and session key for tracking
        client_ip = self.get_client_ip(request)
        session_key = request.session.session_key
        
        # Ensure we have a session
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        
        # Use a simpler cache key based on IP and username (more reliable)
        cache_key = f"login_attempts_{client_ip}_{username}"
        
        # Get current failed attempts from cache
        failed_attempts = cache.get(cache_key, [])
        current_time = time.time()
        
        # Clean old attempts (older than 5 minutes)
        failed_attempts = [attempt_time for attempt_time in failed_attempts if current_time - attempt_time < 300]
        
        logger.warning(f"[CTF RATE LIMIT] ========== LOGIN ATTEMPT ==========")
        logger.warning(f"[CTF RATE LIMIT] Username: '{username}'")
        logger.warning(f"[CTF RATE LIMIT] IP: {client_ip}")
        logger.warning(f"[CTF RATE LIMIT] Session: {session_key[:8] if session_key else 'None'}...")
        logger.warning(f"[CTF RATE LIMIT] Cache Key: {cache_key}")
        logger.warning(f"[CTF RATE LIMIT] Raw failed attempts from cache: {failed_attempts}")
        logger.warning(f"[CTF RATE LIMIT] Cleaned failed attempts count: {len(failed_attempts)}")
        logger.warning(f"[CTF RATE LIMIT] Current time: {current_time}")
        logger.warning(f"[CTF RATE LIMIT] ===============================")
        
        # Debug: Print cache backend info
        print(f"[DEBUG] Cache backend: {cache.__class__.__name__}")
        print(f"[DEBUG] Cache key: {cache_key}")
        print(f"[DEBUG] Raw cache value: {cache.get(cache_key, 'NOT_FOUND')}")
        print(f"[DEBUG] Cleaned failed attempts: {failed_attempts}")
        print(f"[DEBUG] Count: {len(failed_attempts)}")
        
        # Try to authenticate
        user = authenticate(username=username, password=password)
        
        if user:
            # Successful login - check for pending bug discoveries
            logger.error(f"[CTF RATE LIMIT] ========== SUCCESSFUL LOGIN ==========")
            logger.error(f"[CTF RATE LIMIT] User: {user.username} (ID: {user.id})")
            logger.error(f"[CTF RATE LIMIT] Session Key: {session_key}")
            
            # Check BOTH session and cache for pending bugs
            pending_bugs_session = request.session.get('pending_bug_discoveries', [])
            logger.error(f"[CTF RATE LIMIT] Pending bugs in SESSION: {pending_bugs_session}")
            
            # ALSO check cache for rate limiting bug (in case of session issues)
            rate_limit_cache_key = f"rate_limit_bug_pending_{client_ip}_{username}"
            pending_bug_cache = cache.get(rate_limit_cache_key)
            logger.error(f"[CTF RATE LIMIT] Rate limit cache key: {rate_limit_cache_key}")
            logger.error(f"[CTF RATE LIMIT] Pending bug in CACHE: {pending_bug_cache}")
            
            # Clear failed attempts
            cache.delete(cache_key)
            logger.warning(f"[CTF RATE LIMIT] SUCCESS: Cleared cache for key {cache_key}")
            
            # Check for rate limiting bug in EITHER session OR cache
            rate_limiting_bug_found = False
            
            # Check session first
            for bug in pending_bugs_session:
                if bug.get('bug_title') == 'Missing Rate Limiting in Login':
                    rate_limiting_bug_found = True
                    logger.error(f"[CTF RATE LIMIT] Found rate limiting bug in SESSION!")
                    break
            
            # If not found in session, check cache
            if not rate_limiting_bug_found and pending_bug_cache:
                if pending_bug_cache.get('bug_title') == 'Missing Rate Limiting in Login':
                    rate_limiting_bug_found = True
                    logger.error(f"[CTF RATE LIMIT] Found rate limiting bug in CACHE!")
                    # Add it to session for consistency
                    pending_bugs_session.append(pending_bug_cache)
            
            if rate_limiting_bug_found:
                # Try to award points for this bug
                logger.error(f"[CTF RATE LIMIT] 🎉 AWARDING POINTS for rate limiting bug to user {user.username}")
                
                bug_response = trigger_bug_found(
                    user=user,
                    bug_title="Missing Rate Limiting in Login",
                    points=75
                )
                
                logger.error(f"[CTF RATE LIMIT] Bug response: {bug_response}")
                
                # Generate token for successful login
                token, created = Token.objects.get_or_create(user=user)
                
                # Clear the pending bugs from BOTH session AND cache
                request.session['pending_bug_discoveries'] = [
                    bug for bug in pending_bugs_session 
                    if bug.get('bug_title') != 'Missing Rate Limiting in Login'
                ]
                request.session.save()
                cache.delete(rate_limit_cache_key)
                
                logger.error(f"[CTF RATE LIMIT] Cleared pending bugs from session and cache")
                logger.error(f"[CTF RATE LIMIT] Returning CTF success response")
                
                # Return CTF response with login data
                return Response({
                    # Normal login data
                    'token': token.key,
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    # CTF bug discovery data
                    'vulnerability_detected': True,
                    'notification_type': 'success' if bug_response['success'] else 'info',
                    'ctf_message': bug_response['message'],
                    'ctf_points_awarded': bug_response['points_awarded'],
                    'ctf_total_points': bug_response['total_points'],
                    'flag': f"CTF{{missing_rate_limiting_login_{user.id}}}" if bug_response['success'] else None,
                    'description': 'You discovered a missing rate limiting vulnerability! The login endpoint allows unlimited failed attempts, making it vulnerable to brute-force attacks.',
                    'bug_type': 'Missing Rate Limiting',
                    'security_note': 'In a real system, rate limiting should be implemented to prevent brute-force attacks.'
                }, status=status.HTTP_200_OK)
            
            # Normal successful login - check for pending CTF discoveries
            token, created = Token.objects.get_or_create(user=user)
            
            # Check for pending CTF discoveries (like password reset token vulnerability)
            pending_ctf_discoveries = request.session.get('pending_ctf_discoveries', [])
            
            # ALSO check cache for password reset bug attempts by session key
            session_key = request.session.session_key
            if session_key:
                cache_key_session = f"ctf_password_reset_attempt_{session_key}"
                cached_attempt = cache.get(cache_key_session)
                if cached_attempt and cached_attempt.get('bug_title') == 'Predictable Password Reset Token':
                    # Add cached attempt to session discoveries if not already there
                    already_in_session = any(
                        d.get('bug_title') == 'Predictable Password Reset Token' and 
                        d.get('session_key') == session_key
                        for d in pending_ctf_discoveries
                    )
                    if not already_in_session:
                        pending_ctf_discoveries.append(cached_attempt)
                        print(f"[CTF PASSWORD RESET] Found cached password reset attempt for session {session_key}")
                
                # Also check for all CTF bug types in cache
                ctf_bug_types = [
                    ('Invalid Password Reset Token Format', 'ctf_invalid_token_attempt'),
                    ('Invalid Password Reset UID Format', 'ctf_invalid_uid_attempt'),
                    ('Malformed Password Reset Token', 'ctf_malformed_token_attempt'),
                    ('Invalid Base64 in Password Reset Token', 'ctf_invalid_base64_attempt'),
                ]
                
                for bug_title, cache_prefix in ctf_bug_types:
                    cache_key_bug = f"{cache_prefix}_{session_key}"
                    cached_bug_attempt = cache.get(cache_key_bug)
                    if cached_bug_attempt and cached_bug_attempt.get('bug_title') == bug_title:
                        # Add cached attempt to session discoveries if not already there
                        already_in_session = any(
                            d.get('bug_title') == bug_title and 
                            d.get('session_key') == session_key
                            for d in pending_ctf_discoveries
                        )
                        if not already_in_session:
                            pending_ctf_discoveries.append(cached_bug_attempt)
                            print(f"[CTF {bug_title.upper()}] Found cached {bug_title.lower()} attempt for session {session_key}")
            
            logger.warning(f"[CTF PASSWORD RESET] Checking pending CTF discoveries: {pending_ctf_discoveries}")
            
            # Check for all CTF bugs and award points for each one found
            ctf_bugs_to_check = [
                'Invalid Password Reset UID Format',
                'Invalid Password Reset Token Format', 
                'Malformed Password Reset Token',
                'Invalid Base64 in Password Reset Token',
                'Predictable Password Reset Token'
            ]
            
            for bug_title in ctf_bugs_to_check:
                for discovery in pending_ctf_discoveries:
                    if discovery.get('bug_title') == bug_title:
                        logger.error(f"[CTF {bug_title.upper()}] 🎉 AWARDING POINTS for {bug_title.lower()} bug discovery to user {user.username}")
                        
                        # Award CTF points to the user who just logged in
                        bug_response = trigger_bug_found(
                            user=user,
                            bug_title=bug_title,
                            points=100
                        )
                        
                        logger.error(f"[CTF {bug_title.upper()}] Bug response: {bug_response}")
                        
                        # Clear this discovery from BOTH session AND cache
                        remaining_discoveries = [d for d in pending_ctf_discoveries 
                                               if d.get('bug_title') != bug_title]
                        request.session['pending_ctf_discoveries'] = remaining_discoveries
                        request.session.save()
                        
                        # Clear session-based cache for all possible cache keys
                        if session_key:
                            cache_keys_to_clear = [
                                f"ctf_invalid_token_attempt_{session_key}",
                                f"ctf_invalid_uid_attempt_{session_key}",
                                f"ctf_malformed_token_attempt_{session_key}",
                                f"ctf_invalid_base64_attempt_{session_key}",
                                f"ctf_password_reset_attempt_{session_key}"
                            ]
                            for cache_key in cache_keys_to_clear:
                                cache.delete(cache_key)
                        
                        # Generate appropriate flag based on bug type
                        flag_mapping = {
                            'Invalid Password Reset UID Format': f"CTF{{invalid_reset_uid_{user.id}}}",
                            'Invalid Password Reset Token Format': f"CTF{{invalid_reset_token_{user.id}}}",
                            'Malformed Password Reset Token': f"CTF{{malformed_reset_token_{user.id}}}",
                            'Invalid Base64 in Password Reset Token': f"CTF{{invalid_base64_token_{user.id}}}",
                            'Predictable Password Reset Token': f"CTF{{predictable_reset_token_{user.id}}}"
                        }
                        
                        # Generate description based on bug type
                        description_mapping = {
                            'Invalid Password Reset UID Format': 'You discovered an invalid password reset UID format vulnerability!',
                            'Invalid Password Reset Token Format': 'You discovered an invalid password reset token format vulnerability!',
                            'Malformed Password Reset Token': 'You discovered a malformed password reset token vulnerability!',
                            'Invalid Base64 in Password Reset Token': 'You discovered an invalid base64 encoding in password reset token vulnerability!',
                            'Predictable Password Reset Token': 'You discovered a predictable password reset token vulnerability! You attempted to exploit the token format to access another users account.'
                        }
                        
                        # Return CTF success response
                        return Response({
                            # Normal login data
                            'token': token.key,
                            'user_id': user.id,
                            'username': user.username,
                            'email': user.email,
                            # CTF bug discovery data
                            'vulnerability_detected': True,
                            'notification_type': 'success' if bug_response['success'] else 'info',
                            'ctf_message': bug_response['message'],
                            'ctf_points_awarded': bug_response['points_awarded'],
                            'ctf_total_points': bug_response['total_points'],
                            'flag': flag_mapping.get(bug_title, f"CTF{{unknown_bug_{user.id}}}") if bug_response['success'] else None,
                            'description': description_mapping.get(bug_title, 'You discovered a security vulnerability!'),
                            'bug_type': bug_title,
                            'security_note': 'Password reset tokens should be cryptographically secure and properly validated.',
                            'target_username': discovery.get('target_username', 'unknown'),
                            'attempted_exploit': discovery.get('attempted_exploit', f"Attempted to exploit {bug_title.lower()}")
                        }, status=status.HTTP_200_OK)
                        # Break out of both loops after finding and processing the first bug
                        break
                else:
                    continue  # Continue to next bug type if no discovery found
                break  # Break out of outer loop if a bug was processed
            
            # Normal successful login without bugs
            logger.warning(f"[CTF RATE LIMIT] SUCCESS: Normal successful login for user {user.username} (no pending bugs)")
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'email': user.email
            }, status=status.HTTP_200_OK)
        else:
            # Failed login - track the attempt
            failed_attempts.append(current_time)
            
            # CRITICAL: Update cache BEFORE checking threshold
            cache.set(cache_key, failed_attempts, 300)  # Store for 5 minutes
            
            logger.warning(f"[CTF RATE LIMIT] ========== FAILED LOGIN ==========")
            logger.warning(f"[CTF RATE LIMIT] Failed login attempt #{len(failed_attempts)} for username '{username}'")
            logger.warning(f"[CTF RATE LIMIT] IP: {client_ip}")
            logger.warning(f"[CTF RATE LIMIT] BEFORE cache.set - failed_attempts: {failed_attempts}")
            logger.warning(f"[CTF RATE LIMIT] Cache key used: {cache_key}")
            logger.warning(f"[CTF RATE LIMIT] Storing in cache with TTL 300 seconds")
            
            # Debug: Verify the cache write IMMEDIATELY
            verification = cache.get(cache_key, [])
            logger.warning(f"[CTF RATE LIMIT] AFTER cache.set - verification: {verification}")
            logger.warning(f"[CTF RATE LIMIT] Cache verification - stored: {len(failed_attempts)}, retrieved: {len(verification)}")
            logger.warning(f"[CTF RATE LIMIT] Attempts remaining: {max(0, 10 - len(failed_attempts))}")
            logger.warning(f"[CTF RATE LIMIT] ===============================")
            
            # Check for brute-force attack (10+ failed attempts in 5 minutes)
            if len(failed_attempts) >= 10:
                # Brute-force detected! Store in session as pending discovery
                logger.error(f"[CTF RATE LIMIT] 🚨🚨🚨 VULNERABILITY DETECTED! 🚨🚨🚨")
                logger.error(f"[CTF RATE LIMIT] RATE LIMITING BUG FOUND!")
                logger.error(f"[CTF RATE LIMIT] {len(failed_attempts)} failed attempts for username '{username}'")
                logger.error(f"[CTF RATE LIMIT] IP: {client_ip}")
                logger.error(f"[CTF RATE LIMIT] This should have been blocked by rate limiting!")
                
                # Store the bug discovery as pending in the session
                pending_bugs = request.session.get('pending_bug_discoveries', [])
                
                # Check if this bug is already pending
                already_pending = any(
                    bug.get('bug_title') == 'Missing Rate Limiting in Login' 
                    for bug in pending_bugs
                )
                
                bug_data = {
                    'bug_title': 'Missing Rate Limiting in Login',
                    'timestamp': current_time,
                    'target_username': username,
                    'failed_attempts_count': len(failed_attempts),
                    'client_ip': client_ip
                }
                
                if not already_pending:
                    pending_bugs.append(bug_data)
                    request.session['pending_bug_discoveries'] = pending_bugs
                    request.session.save()
                    
                    logger.error(f"[CTF RATE LIMIT] Bug stored as pending for session {session_key[:8] if session_key else 'None'}...")
                    logger.error(f"[CTF RATE LIMIT] Session pending bugs now: {request.session.get('pending_bug_discoveries', [])}")
                else:
                    logger.warning(f"[CTF RATE LIMIT] Bug already pending for this session")
                
                # ALWAYS store in cache as backup (even if already pending in session)
                rate_limit_cache_key = f"rate_limit_bug_pending_{client_ip}_{username}"
                cache.set(rate_limit_cache_key, bug_data, 1800)  # 30 minutes TTL
                logger.error(f"[CTF RATE LIMIT] Bug ALSO stored in cache with key: {rate_limit_cache_key}")
                
                # Clear the failed attempts after detection to reset counter
                cache.delete(cache_key)
                
                logger.error(f"[CTF RATE LIMIT] Sending vulnerability detection response to frontend")
                
                # Return response indicating vulnerability detected with dispatch instruction
                return Response({
                    'error': 'Invalid credentials.',
                    'rate_limiting_bug_detected': True,
                    'ctf_message': f'🚨 Rate limiting vulnerability detected! You made {len(failed_attempts)} failed login attempts.',
                    'message': 'No rate limiting protection found - this is a critical security vulnerability!',
                    'failed_attempts_count': len(failed_attempts),
                    'security_hint': 'Now login with correct credentials to claim your CTF points!',
                    'vulnerability_type': 'Missing Rate Limiting',
                    'points_pending': 75,
                    'dispatch_event': True,
                    'event_type': 'ctf-rate-limit-detected',
                    'event_data': {
                        'bug_type': 'Rate Limiting Bypass',
                        'description': 'Application lacks proper rate limiting on login attempts',
                        'message': 'Rate limiting vulnerability detected! No protection against brute force attacks.',
                        'instruction': 'Now login with correct credentials to claim your points!',
                        'failed_attempts': len(failed_attempts),
                        'target_username': username
                    }
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Normal failed login response
            return Response({
                'error': 'Invalid credentials.',
                'failed_attempts': len(failed_attempts),
                'attempts_remaining': max(0, 10 - len(failed_attempts)),
                'message': f'Login failed. {max(0, 10 - len(failed_attempts))} attempts remaining before rate limiting should kick in.'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_client_ip(self, request):
        """
        Get the client IP address from the request.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or '127.0.0.1'  # Fallback for development


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
            
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'User created successfully.',
                'token': token.key,
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
            request.user.auth_token.delete()
            return Response(
                {'message': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to logout.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForgotPasswordView(APIView):
    """
    Forgot password view that generates a password reset token.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        import uuid
        import base64
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'error': 'No user found with this email address.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # VULNERABLE: Generate predictable token format for CTF
        # Instead of secure Django token, use: {uuid}-{base64_username}
        random_uuid = str(uuid.uuid4())
        base64_username = base64.b64encode(user.username.encode()).decode()
        predictable_token = f"{random_uuid}-{base64_username}"
        
        # Use base64 encoded username as uidb64 (instead of user ID)
        uidb64 = base64.b64encode(user.username.encode()).decode()
        
        # Print reset link to console (CTF format)
        reset_link = f"http://localhost:5173/reset-password/{uidb64}/{predictable_token}/"
        print(f"\n🔑 PASSWORD RESET LINK for {user.email}:")
        print(f"📧 User: {user.username} ({user.email})")
        print(f"🔗 Reset Link: {reset_link}")
        print(f"🚨 CTF NOTE: Token format is {random_uuid}-{base64_username}")
        print(f"⏰ Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        return Response({
            'message': 'Password reset link sent! Check console.'
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Reset password view that validates token and updates password.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, uidb64, token):
        import base64
        from .ctf_views import trigger_bug_found
        
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({
                'error': 'New password is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 6:
            return Response({
                'error': 'Password must be at least 6 characters long.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode uidb64 to get username (our vulnerable format)
            username_from_uidb64 = base64.b64decode(uidb64).decode()
            user = User.objects.get(username=username_from_uidb64)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'error': 'Invalid reset link.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse the predictable token format: {uuid}-{base64_username}
        try:
            if '-' not in token:
                print(f"🚨 CTF BUG DETECTED: Invalid Token Format!")
                bug_title = "Invalid Password Reset Token Format"
                points = 100
                
                if request.user.is_authenticated:
                    # User is logged in, award points immediately
                    bug_response = trigger_bug_found(
                        user=request.user,
                        bug_title=bug_title,
                        points=points
                    )
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{invalid_reset_token_{request.user.id}}}",
                        'description': 'You discovered an invalid password reset token format vulnerability!',
                        'bug_type': bug_title,
                    }, status=status.HTTP_200_OK)
                else:
                    # If anonymous, store in session to award points on login
                    if not request.session.session_key:
                        request.session.create()
                    
                    bug_data = {
                        'bug_title': bug_title,
                        'points': points,
                        'timestamp': time.time(),
                        'session_key': request.session.session_key
                    }
                    
                    pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                    # Avoid duplicate entries for the same session
                    if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                        pending_discoveries.append(bug_data)
                        request.session['pending_ctf_discoveries'] = pending_discoveries
                        request.session.save()
                        
                        # Also cache it as a backup
                        cache_key = f"ctf_invalid_token_attempt_{request.session.session_key}"
                        cache.set(cache_key, bug_data, 3600) # 1 hour TTL
                        print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                    return Response({
                        'vulnerability_detected': True,
                        'bug_title': bug_title,
                        'points_pending': points,
                        'message': 'Vulnerability found! Log in to your account to claim the points.',
                        'error': 'Invalid reset token. The token does not match the requested user.',
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Split token into uuid and base64_username parts
            # Token format is: uuid-base64_username
            # Example: ec50db18-2aac-4f6b-979e-5503f42de984-YWxpY2U=
            
            # Find the last occurrence of dash followed by base64 pattern
            # The UUID part contains dashes, so we need to find the final base64 part
            token_parts = token.rsplit('-', 1)  # Split from the right to get the last part
            if len(token_parts) != 2:
                return Response({
                    'error': 'Invalid token format.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            uuid_part = token_parts[0]
            base64_username_part = token_parts[1]
            
            # Decode the base64 username from token
            try:
                username_from_token = base64.b64decode(base64_username_part).decode()
            except Exception as e:
                print(f"Base64 decode error: {e}")
                return Response({
                    'error': 'Invalid token format.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"\n🔍 CTF TOKEN ANALYSIS:")
            print(f"📧 User from uidb64: {username_from_uidb64}")
            print(f"🎯 Username from token: {username_from_token}")
            print(f"🔗 Token format: {uuid_part}-{base64_username_part}")
            print(f"🔗 Full token: {token}")
            
            # CTF VULNERABILITY DETECTION: Check if usernames don't match
            if username_from_token != username_from_uidb64:
                print(f"🚨 CTF BUG DETECTED: Username mismatch!")
                print(f"   Expected (from uidb64): {username_from_uidb64}")
                print(f"   From token: {username_from_token}")
                
                bug_title = "Predictable Password Reset Token"
                points = 100
                
                # Check if the user is already authenticated
                if request.user.is_authenticated:
                    # If authenticated, award points directly
                    bug_response = trigger_bug_found(
                        user=request.user,
                        bug_title=bug_title,
                        points=points
                    )
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{predictable_reset_token_{request.user.id}}}",
                        'description': 'You discovered a predictable password reset token vulnerability!',
                        'bug_type': bug_title,
                    }, status=status.HTTP_200_OK)
                else:
                    # If anonymous, store in session to award points on login
                    if not request.session.session_key:
                        request.session.create()
                    
                    bug_data = {
                        'bug_title': bug_title,
                        'points': points,
                        'target_username': username_from_uidb64,
                        'token_username': username_from_token,
                        'timestamp': time.time(),
                        'session_key': request.session.session_key
                    }
                    
                    pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                    # Avoid duplicate entries for the same session
                    if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                        pending_discoveries.append(bug_data)
                        request.session['pending_ctf_discoveries'] = pending_discoveries
                        request.session.save()
                        
                        # Also cache it as a backup
                        cache_key = f"ctf_password_reset_attempt_{request.session.session_key}"
                        cache.set(cache_key, bug_data, 3600) # 1 hour TTL
                        print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                    return Response({
                        'vulnerability_detected': True,
                        'bug_title': bug_title,
                        'points_pending': points,
                        'message': 'Vulnerability found! Log in to your account to claim the points.',
                        'error': 'Invalid reset token. The token does not match the requested user.',
                        'security_note': 'This incident has been logged.',
                    }, status=status.HTTP_400_BAD_REQUEST)

            else:
                print(f"✅ Normal password reset - usernames match")
            
        except Exception as e:
            print(f"Token parsing error: {e}")
            return Response({
                'error': 'Invalid token format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Continue with normal password reset only if no vulnerability was detected
        user.set_password(new_password)
        user.save()
        
        print(f"\n✅ PASSWORD RESET SUCCESSFUL:")
        print(f"📧 User: {user.username} ({user.email})")
        print(f"🔐 Password updated at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        
        return Response({
            'message': 'Password successfully reset.'
        }, status=status.HTTP_200_OK)


class PasswordResetVerifyView(APIView):
    """
    Verifies a password reset token for predictable misuse without changing the password.
    This endpoint is specifically for the CTF challenge.
    
    NEW BEHAVIOR (Split Notification System):
    - For unauthenticated users: Return only simple warning messages
    - For authenticated users: Award points immediately  
    - Bug discovery and points awarding happens only after login
    """
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        import base64
        import time
        from .ctf_views import trigger_bug_found

        # Check for invalid UID format FIRST
        try:
            # Decode uidb64 to get the target username
            username_from_uidb64 = base64.b64decode(uidb64).decode()
        except (TypeError, ValueError, OverflowError):
            print(f"🚨 CTF BUG DETECTED: Invalid UID Format!")
            bug_title = "Invalid Password Reset UID Format"
            points = 100
            
            if request.user.is_authenticated:
                # User is logged in, award points immediately
                bug_response = trigger_bug_found(
                    user=request.user,
                    bug_title=bug_title,
                    points=points
                )
                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "success",
                    "bug_title": bug_title,
                    "ctf_message": f"Bug points awarded immediately since you're logged in!",
                    "flag": f"CTF{{invalid_reset_uid_{request.user.id}}}",
                    "points_awarded": bug_response['points_awarded'],
                    "total_points": bug_response['total_points'],
                    "require_login": False
                }, status=status.HTTP_200_OK)
            else:
                # User is not logged in, store pending discovery in session and return simple warning
                if not request.session.session_key:
                    request.session.create()
                
                bug_data = {
                    'bug_title': bug_title,
                    'points': points,
                    'timestamp': time.time(),
                    'session_key': request.session.session_key
                }
                
                pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                    pending_discoveries.append(bug_data)
                    request.session['pending_ctf_discoveries'] = pending_discoveries
                    request.session.save()
                    
                    # Also cache it as backup
                    cache_key = f"ctf_invalid_uid_attempt_{request.session.session_key}"
                    cache.set(cache_key, bug_data, 3600)  # 1 hour TTL
                    print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "warning",
                    "bug_title": bug_title,
                    "warning_message": "⚠️ Invalid password reset link format detected. Please login to continue.",
                    "require_login": True
                }, status=status.HTTP_200_OK)

        # Check for invalid token format - enhanced detection
        if not token or '-' not in token or token.startswith('-') or token.endswith('-') or token == '---':
            if not token:
                bug_title = "Empty Password Reset Token"
                print(f"🚨 CTF BUG DETECTED: Empty Token!")
            elif token.startswith('-'):
                bug_title = "Malformed Password Reset Token"
                print(f"🚨 CTF BUG DETECTED: Token starts with dash!")
            elif token.endswith('-'):
                bug_title = "Malformed Password Reset Token" 
                print(f"🚨 CTF BUG DETECTED: Token ends with dash!")
            elif token == '---':
                bug_title = "Malformed Password Reset Token"
                print(f"🚨 CTF BUG DETECTED: Token contains only dashes!")
            else:
                bug_title = "Invalid Password Reset Token Format"
                print(f"🚨 CTF BUG DETECTED: Invalid Token Format!")
            
            points = 100
            
            if request.user.is_authenticated:
                # User is logged in, award points immediately
                bug_response = trigger_bug_found(
                    user=request.user,
                    bug_title=bug_title,
                    points=points
                )
                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "success",
                    "bug_title": bug_title,
                    "ctf_message": f"Bug points awarded immediately since you're logged in!",
                    "flag": f"CTF{{invalid_reset_token_{request.user.id}}}",
                    "points_awarded": bug_response['points_awarded'],
                    "total_points": bug_response['total_points'],
                    "require_login": False
                }, status=status.HTTP_200_OK)
            else:
                # User is not logged in, store pending discovery in session
                if not request.session.session_key:
                    request.session.create()
                
                bug_data = {
                    'bug_title': bug_title,
                    'points': points,
                    'timestamp': time.time(),
                    'session_key': request.session.session_key
                }
                
                pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                    pending_discoveries.append(bug_data)
                    request.session['pending_ctf_discoveries'] = pending_discoveries
                    request.session.save()
                    
                    # Also cache it as backup
                    cache_key = f"ctf_invalid_token_attempt_{request.session.session_key}"
                    cache.set(cache_key, bug_data, 3600)  # 1 hour TTL
                    print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "warning",
                    "bug_title": bug_title,
                    "warning_message": "⚠️ Invalid password reset token format detected. Please login to continue.",
                    "require_login": True
                }, status=status.HTTP_200_OK)

        try:
            # Extract the base64 encoded username from the token suffix
            token_parts = token.rsplit('-', 1)
            if len(token_parts) != 2:
                print(f"🚨 CTF BUG DETECTED: Malformed Token Structure!")
                bug_title = "Malformed Password Reset Token"
                points = 100
                
                if request.user.is_authenticated:
                    # User is logged in, award points immediately
                    bug_response = trigger_bug_found(
                        user=request.user,
                        bug_title=bug_title,
                        points=points
                    )
                    return Response({
                        "vulnerability_detected": True,
                        "notification_type": "success",
                        "bug_title": bug_title,
                        "ctf_message": f"Bug points awarded immediately since you're logged in!",
                        "flag": f"CTF{{malformed_reset_token_{request.user.id}}}",
                        "points_awarded": bug_response['points_awarded'],
                        "total_points": bug_response['total_points'],
                        "require_login": False
                    }, status=status.HTTP_200_OK)
                else:
                    # User is not logged in, store pending discovery in session and return simple warning
                    if not request.session.session_key:
                        request.session.create()
                    
                    bug_data = {
                        'bug_title': bug_title,
                        'points': points,
                        'timestamp': time.time(),
                        'session_key': request.session.session_key
                    }
                    
                    pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                    if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                        pending_discoveries.append(bug_data)
                        request.session['pending_ctf_discoveries'] = pending_discoveries
                        request.session.save()
                        
                        # Also cache it as backup
                        cache_key = f"ctf_malformed_token_attempt_{request.session.session_key}"
                        cache.set(cache_key, bug_data, 3600)  # 1 hour TTL
                        print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                    return Response({
                        "vulnerability_detected": True,
                        "notification_type": "warning",
                        "bug_title": bug_title,
                        "warning_message": "⚠️ Malformed password reset token detected. Please login to continue.",
                        "require_login": True
                    }, status=status.HTTP_200_OK)
            
            base64_username_part = token_parts[1]
            try:
                username_from_token = base64.b64decode(base64_username_part).decode()
            except Exception:
                print(f"🚨 CTF BUG DETECTED: Invalid Base64 in Token!")
                bug_title = "Invalid Base64 in Password Reset Token"
                points = 100
                
                if request.user.is_authenticated:
                    # User is logged in, award points immediately
                    bug_response = trigger_bug_found(
                        user=request.user,
                        bug_title=bug_title,
                        points=points
                    )
                    return Response({
                        "vulnerability_detected": True,
                        "notification_type": "success",
                        "bug_title": bug_title,
                        "ctf_message": f"Bug points awarded immediately since you're logged in!",
                        "flag": f"CTF{{invalid_base64_token_{request.user.id}}}",
                        "points_awarded": bug_response['points_awarded'],
                        "total_points": bug_response['total_points'],
                        "require_login": False
                    }, status=status.HTTP_200_OK)
                else:
                    # User is not logged in, store pending discovery in session
                    if not request.session.session_key:
                        request.session.create()
                    
                    bug_data = {
                        'bug_title': bug_title,
                        'points': points,
                        'timestamp': time.time(),
                        'session_key': request.session.session_key
                    }
                    
                    pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                    if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                        pending_discoveries.append(bug_data)
                        request.session['pending_ctf_discoveries'] = pending_discoveries
                        request.session.save()
                        
                        # Also cache it as backup
                        cache_key = f"ctf_invalid_base64_attempt_{request.session.session_key}"
                        cache.set(cache_key, bug_data, 3600)  # 1 hour TTL
                        print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                    return Response({
                        "vulnerability_detected": True,
                        "notification_type": "warning",
                        "bug_title": bug_title,
                        "warning_message": "⚠️ Invalid base64 encoding detected in password reset token. Please login to continue.",
                        "require_login": True
                    }, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Invalid token format.'}, status=status.HTTP_400_BAD_REQUEST)

        print(f"\n🔍 CTF TOKEN VERIFICATION:")
        print(f"📧 User from uidb64: {username_from_uidb64}")
        print(f"🎯 Username from token: {username_from_token}")
        print(f"🔗 Full token: {token}")

        # Check for the vulnerability: username from URL vs. username from token
        if username_from_uidb64 != username_from_token:
            # Predictable token misuse detected
            bug_title = "Predictable Password Reset Token"
            
            print(f"🚨 CTF BUG DETECTED: Username mismatch!")
            print(f"   Expected (from uidb64): {username_from_uidb64}")
            print(f"   From token: {username_from_token}")
            
            if request.user.is_authenticated:
                # User is logged in, award points immediately
                bug_response = trigger_bug_found(request.user, bug_title, 100)
                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "success",
                    "bug_title": bug_title,
                    "ctf_message": f"Bug points awarded immediately since you're logged in!",
                    "flag": f"CTF{{predictable_reset_token_{request.user.id}}}" if bug_response['success'] else "Already solved",
                    "points_awarded": bug_response['points_awarded'],
                    "total_points": bug_response['total_points'],
                    "require_login": False
                }, status=status.HTTP_200_OK)
            else:
                # User is not logged in, store pending discovery in session
                if not request.session.session_key:
                    request.session.create()
                
                bug_data = {
                    'bug_title': bug_title,
                    'points': 100,
                    'target_username': username_from_uidb64,
                    'token_username': username_from_token,
                    'timestamp': time.time(),
                    'session_key': request.session.session_key
                }
                
                pending_discoveries = request.session.get('pending_ctf_discoveries', [])
                if not any(d.get('bug_title') == bug_title for d in pending_discoveries):
                    pending_discoveries.append(bug_data)
                    request.session['pending_ctf_discoveries'] = pending_discoveries
                    request.session.save()
                    
                    # Also cache it as backup
                    cache_key = f"ctf_password_reset_attempt_{request.session.session_key}"
                    cache.set(cache_key, bug_data, 3600)  # 1 hour TTL
                    print(f"🎯 CTF discovery stored for session: {request.session.session_key}")

                return Response({
                    "vulnerability_detected": True,
                    "notification_type": "warning",
                    "bug_title": bug_title,
                    "warning_message": "⚠️ Predictable password reset token detected. Please login to continue.",
                    "require_login": True
                }, status=status.HTTP_200_OK)
        else:
            # Token is valid (for the purpose of this check), no vulnerability detected
            print(f"✅ Token verification passed - usernames match")
            return Response({
                "vulnerability_detected": False,
                "valid": True
            }, status=status.HTTP_200_OK)


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
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if current user is following this user
        is_following = False
        if request.user.is_authenticated:
            is_following = Follow.objects.filter(
                follower=request.user,
                following=user
            ).exists()
        
        return Response({
            'id': user.id,
            'username': user.username,
            'bio': user.bio,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'followers_count': user.followers.count(),
            'following_count': user.following.count(),
            'posts_count': user.posts.count(),
            'is_following': is_following,
            'created_at': user.created_at
        }, status=status.HTTP_200_OK)


class UserSearchView(APIView):
    """
    Basic user search by username (safe implementation).
    For advanced search features, users should use the main search endpoint.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        search_query = request.query_params.get('search', '')
        
        if not search_query:
            return Response({
                'error': 'Search query is required.',
                'message': 'Please provide a search term.',
                'results': [],
                'count': 0
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Simple, safe username search using Django ORM
        try:
            users = User.objects.filter(
                username__icontains=search_query
            ).exclude(
                id=request.user.id if request.user.is_authenticated else None
            )[:10]
            
            results = []
            for user in users:
                results.append({
                    'id': user.id,
                    'username': user.username,
                    'profile_picture': user.profile_picture.url if user.profile_picture else None
                })
            
            return Response({
                'results': results,
                'count': len(results),
                'search_query': search_query,
                'message': f'Found {len(results)} users matching "{search_query}"'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in basic user search: {e}")
            return Response({
                'error': 'Search failed. Please try again.',
                'results': [],
                'count': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            message = f'You are now following {target_user.username}.'
            is_following = True
            
            # Create notification for followed user
            create_notification(
                receiver=target_user,
                sender=request.user,
                notification_type='follow'
            )
        else:
            message = f'You are already following {target_user.username}.'
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
            message = f'You have unfollowed {target_user.username}.'
            is_following = False
        except Follow.DoesNotExist:
            message = f'You are not following {target_user.username}.'
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
            
            return Response(
                {'message': 'Notification marked as read.'},
                status=status.HTTP_200_OK
            )
            
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
                'message': 'Follow some users to see their posts in your feed.'
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
    Get all posts by a specific user.
    Returns different post categories based on the requesting user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        try:
            user = get_object_or_404(User, username=username)
            
            # If viewing own profile, show all posts (public and private)
            if request.user == user:
                posts = Post.objects.filter(user=user).order_by('-created_at')
            else:
                # If viewing someone else's profile, only show public posts
                posts = Post.objects.filter(user=user, is_private=False).order_by('-created_at')
            
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response({
                'count': posts.count(),
                'results': serializer.data
            })
        except Exception as e:
            return Response({'error': 'Failed to fetch posts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyPostsView(APIView):
    """
    Get current user's public posts (is_private=False).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            posts = Post.objects.filter(
                user=request.user,
                is_private=False
            ).order_by('-created_at')
            
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response({
                'count': posts.count(),
                'results': serializer.data
            })
        except Exception as e:
            return Response({'error': 'Failed to fetch posts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PrivatePostsView(APIView):
    """
    Get current user's private posts (is_private=True).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            posts = Post.objects.filter(
                user=request.user,
                is_private=True
            ).order_by('-created_at')
            
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response({
                'count': posts.count(),
                'results': serializer.data
            })
        except Exception as e:
            return Response({'error': 'Failed to fetch private posts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SavedPostsView(APIView):
    """
    Get posts saved by the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get all saved posts for the current user
            saved_posts = Save.objects.filter(user=request.user).order_by('-created_at')
            posts = [save.post for save in saved_posts]
            
            serializer = PostSerializer(posts, many=True, context={'request': request})
            return Response({
                'count': len(posts),
                'results': serializer.data
            })
        except Exception as e:
            return Response({'error': 'Failed to fetch saved posts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            return Response({'error': 'receiver_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        sender = request.user
        if sender == receiver:
            return Response({'error': 'Cannot start thread with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a thread already exists
        thread = ChatThread.objects.filter(participants=sender).filter(participants=receiver).first()

        if not thread:
            thread = ChatThread.objects.create()
            thread.participants.set([sender, receiver])
        
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
            return Response({'error': 'Thread not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        thread.is_accepted = True
        thread.save()
        return Response({'message': 'Chat request accepted.'}, status=status.HTTP_200_OK)


class MessageListView(APIView):
    """
    List messages in a thread and create new messages.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        print(f"[DEBUG] === MessageListView.get() called ===")
        print(f"[DEBUG] thread_id: {thread_id} (type: {type(thread_id)})")
        print(f"[DEBUG] request.user: {request.user} (ID: {request.user.id if request.user.is_authenticated else 'Anonymous'})")
        
        logger.info(f"[CTF] User {request.user.id} ({request.user.username}) requests thread_id={thread_id}")

        try:
            thread = ChatThread.objects.get(id=thread_id)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_participant = thread.participants.filter(id=request.user.id).exists()
        print(f"[DEBUG] is_participant check: {is_participant}")
        print(f"[DEBUG] User ID: {request.user.id}")
        print(f"[DEBUG] Participant IDs: {list(thread.participants.values_list('id', flat=True))}")
        logger.info(f"[CTF] User {request.user.id} is_participant={is_participant}")

        # Normal access check for participants
        if not is_participant:
            return Response({'error': 'Access denied. You are not a participant in this thread.'}, status=status.HTTP_403_FORBIDDEN)

        # Normal access for participants
        print(f"[DEBUG] === NORMAL ACCESS (USER IS PARTICIPANT) ===")
        logger.info(f"[CTF] User {request.user.id} is allowed to view thread {thread_id}")
        messages = thread.messages.all().order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        print(f"[DEBUG] Returning {len(messages)} messages")
        return Response(serializer.data)

    def post(self, request, thread_id):
        try:
            thread = ChatThread.objects.get(id=thread_id, participants=request.user)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        if not thread.is_accepted:
            return Response({'error': 'Thread not accepted yet.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ChatMessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(sender=request.user, thread=thread)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    def post(self, request, thread_id):
        try:
            thread = ChatThread.objects.get(id=thread_id, participants=request.user)
        except ChatThread.DoesNotExist:
            return Response({'error': 'Thread not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        if not thread.is_accepted:
            return Response({'error': 'Thread not accepted yet.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ChatMessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(sender=request.user, thread=thread)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
