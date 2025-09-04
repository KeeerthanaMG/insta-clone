from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F  # Add this import
from django.contrib.auth import get_user_model, authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q
from django.http import HttpResponse, Http404
from django.core.cache import cache
import logging
import time
import secrets
import base64
from collections import defaultdict

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


def trigger_bug_found(user, bug_title, points=50):
    """
    Helper function to handle bug discovery.
    Awards points only if this is the first time the user found this bug.
    Fixed to prevent double counting with proper atomic transactions.
    """
    try:
        # Get or create the bug entry
        bug, _ = Bug.objects.get_or_create(
            title=bug_title,
            defaults={
                'description': f'User discovered {bug_title}',
                'category': 'security',
                'points': points
            }
        )
        
        # Use atomic transaction to prevent race conditions and double counting
        with transaction.atomic():
            # Use get_or_create with proper locking
            bug_solve, created = BugSolve.objects.select_for_update().get_or_create(
                user=user,
                bug=bug
            )
            
            if created:
                # First time finding this bug - update user stats atomically
                # Use F() expressions to prevent race conditions
                user_updated = User.objects.filter(id=user.id).update(
                    points=F('points') + points,
                    bugs_solved=F('bugs_solved') + 1
                )
                
                if user_updated:
                    # Refresh user object to get updated values
                    user.refresh_from_db()
                    
                    # Update or create leaderboard entry
                    leaderboard, _ = Leaderboard.objects.get_or_create(user=user)
                    leaderboard.update_stats()
                    
                    logger.info(f"[CTF] Bug '{bug_title}' solved by user {user.id} for {points} points. Total: {user.points}")
                    
                    return {
                        'success': True,
                        'message': f'{bug_title} bug found! +{points} points',
                        'points_awarded': points,
                        'total_points': user.points,
                        'bugs_count': user.bugs_solved,
                        'flag': f'CTF{{{bug_title.lower().replace(" ", "_")}_{user.id}}}'
                    }
                else:
                    logger.error(f"[CTF] Failed to update user {user.id} stats")
                    return {
                        'success': False,
                        'message': 'Error updating user stats.',
                        'points_awarded': 0,
                        'total_points': user.points
                    }
            else:
                # Already found this bug
                logger.info(f"[CTF] User {user.id} attempted to re-solve bug '{bug_title}'")
                return {
                    'success': False,
                    'message': 'You have already found this bug. No extra points.',
                    'points_awarded': 0,
                    'total_points': user.points,
                    'bugs_count': user.bugs_solved
                }
                
    except Exception as e:
        logger.error(f"Error in trigger_bug_found: {e}")
        return {
            'success': False,
            'message': 'Error processing bug discovery.',
            'points_awarded': 0,
            'total_points': user.points if hasattr(user, 'points') else 0,
            'bugs_count': user.bugs_solved if hasattr(user, 'bugs_solved') else 0
        }


class DebugThreadsView(APIView):
    """
    Debug view to list all threads - REMOVE IN PRODUCTION
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        threads = ChatThread.objects.all()
        debug_data = []
        
        for thread in threads:
            participants = list(thread.participants.values('id', 'username'))
            debug_data.append({
                'id': thread.id,
                'participants': participants,
                'is_accepted': thread.is_accepted,
                'message_count': thread.messages.count(),
                'created_at': thread.created_at
            })
        
        return Response({
            'total_threads': threads.count(),
            'threads': debug_data,
            'current_user_id': request.user.id,
            'current_username': request.user.username
        })


class SetUserRoleView(APIView):
    """
    🚨 VULNERABLE ENDPOINT: /api/users/set_role
    
    This endpoint appears to allow any authenticated user to change their role
    to admin/moderator without proper authorization checks.
    
    In a real system, this would be extremely dangerous as it would allow
    privilege escalation attacks. However, this is a CTF/learning environment
    where we intercept the attempt and award points instead of actually
    changing roles.
    
    Expected exploit attempt:
    POST /api/users/set_role
    {"role": "admin"}
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'options']  # Explicitly allow GET, POST and OPTIONS
    
    def get(self, request):
        """Test method to verify the endpoint is accessible"""
        return Response({
            'message': 'SetUserRoleView is accessible',
            'user': request.user.username,
            'methods_allowed': ['GET', 'POST', 'OPTIONS']
        }, status=status.HTTP_200_OK)
    
    def options(self, request):
        """Handle CORS preflight requests"""
        return Response({'detail': 'CORS preflight'}, status=status.HTTP_200_OK)
    
    def post(self, request):
        print(f"[DEBUG] SetUserRoleView.post() called!")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request data: {request.data}")
        print(f"[DEBUG] User: {request.user}")
        
        user = request.user
        new_role = request.data.get('role', '').lower()
        
        # Log the exploitation attempt for educational purposes
        logger.warning(f"[CTF] Privilege escalation attempt detected: User {user.username} (ID: {user.id}) attempted to set role to '{new_role}'")
        
        # Validate that it's a realistic privilege escalation attempt
        if new_role not in ['admin', 'administrator', 'moderator', 'staff', 'superuser']:
            return Response({
                'error': 'Invalid role specified. Valid roles: admin, moderator, staff',
                'message': 'Role must be one of: admin, moderator, staff'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # This is where a real vulnerable system would actually change the user's role
        # Instead, we trigger the CTF bug detection mechanism
        bug_result = trigger_bug_found(
            user=user, 
            bug_title="Privilege Escalation via API Endpoint", 
            points=50
        )
        
        if bug_result['success']:
            # CTF SIMULATION: This endpoint appears vulnerable but doesn't actually change roles
            # Instead, we detect the exploit attempt and award points for finding the bug
            return Response({
                'vulnerability_detected': True,
                'message': f'🚨 CTF Challenge: Privilege Escalation Vulnerability Found!',
                'description': f'You attempted to escalate to {new_role} - this would be dangerous in a real system!',
                'actual_user_role': 'user',  # No role was actually changed
                'attempted_role': new_role,
                'user_id': user.id,
                'username': user.username,
                # CTF-specific data for popup
                'flag': bug_result.get('flag'),
                'ctf_points_awarded': bug_result['points_awarded'],
                'ctf_total_points': bug_result['total_points'],
                'ctf_message': bug_result['message'],
                'security_note': 'In a real system, this would be a critical security vulnerability!'
            }, status=status.HTTP_200_OK)
        else:
            # User already found this bug
            return Response({
                'vulnerability_detected': True,
                'message': f'🚨 CTF Challenge: You already found this vulnerability!',
                'description': f'Attempted privilege escalation to {new_role} already recorded.',
                'actual_user_role': 'user',  # No role was actually changed
                'attempted_role': new_role,
                'user_id': user.id,
                'username': user.username,
                'ctf_message': bug_result['message'],
                'ctf_points_awarded': 0,
                'ctf_total_points': bug_result['total_points'],
                'security_note': 'In a real system, this would be a critical security vulnerability!'
            }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_post_image(request, post_id):
    """
    VULNERABLE ENDPOINT: Serves post images without checking privacy settings.
    This is the CTF bug - it should check if post is private and user has access.
    """
    try:
        post = get_object_or_404(Post, id=post_id)
        
        # VULNERABILITY: Not checking if post is private!
        # Should verify: if post.is_private and post.user != request.user: return 403
        
        # Check if user is accessing someone else's private post (CTF bug detection)
        if post.is_private and post.user != request.user:
            # Bug found! Trigger CTF response
            bug_response = trigger_bug_found(
                user=request.user,
                bug_title="Private Post Viewing",
                points=100  # Higher points for privacy vulnerability
            )
            
            # Return the bug response instead of the image
            return Response({
                'vulnerability_detected': True,
                'ctf_message': bug_response['message'],
                'ctf_points_awarded': bug_response['points_awarded'],
                'ctf_total_points': bug_response['total_points'],
                'flag': bug_response.get('flag'),
                'description': 'You discovered a privacy bypass vulnerability! Private posts should not be accessible to unauthorized users.',
                'bug_type': 'Privacy Bypass'
            }, status=status.HTTP_200_OK)
        
        # Normal case: serve the image
        image_path = post.image.path
        with open(image_path, 'rb') as f:
            image_data = f.read()
            
        # Determine content type based on file extension
        if image_path.lower().endswith('.png'):
            content_type = 'image/png'
        elif image_path.lower().endswith('.gif'):
            content_type = 'image/gif'
        else:
            content_type = 'image/jpeg'
            
        return HttpResponse(image_data, content_type=content_type)
        
    except Post.DoesNotExist:
        raise Http404("Post not found")
    except FileNotFoundError:
        raise Http404("Image file not found")
    except Exception as e:
        return Response({
            'error': 'Failed to serve image'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VulnerableMessageListView(APIView):
    """
    🚨 VULNERABLE ENDPOINT: IDOR vulnerability in message access.
    
    This view allows accessing chat messages by thread_id without proper 
    participant verification. This is intentionally vulnerable for CTF purposes.
    
    Normal participants should use the regular MessageListView from core_views.py
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        print(f"[DEBUG] === VulnerableMessageListView.get() called ===")
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

        # IDOR bug detection: user is NOT a participant
        if not is_participant:
            print(f"[DEBUG] === IDOR VULNERABILITY DETECTED ===")
            logger.warning(f"[CTF] IDOR attempt detected: User {request.user.id} ({request.user.username}) tried to access thread {thread_id} without permission")
            
            # Trigger bug found mechanism
            bug_result = trigger_bug_found(
                user=request.user,
                bug_title="IDOR in Chat Messages",
                points=75
            )
            
            # Return CTF response instead of actual messages
            return Response({
                'vulnerability_detected': True,
                'message': 'IDOR in Chat Messages bug found!',
                'description': 'You accessed chat messages without being a participant.',
                'ctf_message': bug_result['message'],
                'ctf_points_awarded': bug_result['points_awarded'],
                'ctf_total_points': bug_result['total_points'],
                'flag': f"CTF{{idor_chat_messages_{request.user.id}_{thread_id}}}" if bug_result['success'] else None,
                'thread_id': thread_id,
                'participant_check_bypassed': True,
                'bug_type': 'IDOR (Insecure Direct Object Reference)'
            }, status=status.HTTP_200_OK)

        # Normal access for participants
        print(f"[DEBUG] === NORMAL ACCESS (USER IS PARTICIPANT) ===")
        logger.info(f"[CTF] User {request.user.id} is allowed to view thread {thread_id}")
        messages = thread.messages.all().order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        print(f"[DEBUG] Returning {len(messages)} messages")
        return Response(serializer.data)


SAVE_ATTEMPT_TRACKER = defaultdict(list)

def create_notification(receiver, sender, notification_type, post=None, comment=None):
    """
    Helper function to create notifications.
    """
    try:
        # Avoid creating notifications for self-interactions
        if receiver == sender:
            return None
            
        # Check if notification already exists for save notifications
        if notification_type == 'save' and post:
            existing = Notification.objects.filter(
                receiver=receiver,
                sender=sender,
                notification_type=notification_type,
                post=post
            ).exists()
            if existing:
                return None
        
        notification = Notification.objects.create(
            receiver=receiver,
            sender=sender,
            notification_type=notification_type,
            post=post,
            comment=comment
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return None

class SavePostView(APIView):
    """
    VULNERABLE ENDPOINT: Save/unsave posts with race condition vulnerability.
    
    This endpoint intentionally lacks proper concurrency control.
    If a user rapidly clicks the save button 10+ times, it detects the race condition
    and triggers the CTF bug discovery mechanism.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = get_object_or_404(Post, id=post_id)
            user = request.user
            current_time = time.time()
            
            # Track rapid save attempts for race condition detection
            user_attempts = SAVE_ATTEMPT_TRACKER[f"{user.id}_{post_id}"]
            
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
                SAVE_ATTEMPT_TRACKER[f"{user.id}_{post_id}"].clear()
                
                if bug_response['success']:
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{race_condition_saved_{user.id}_{post_id}}}",
                        'description': 'You discovered a race condition vulnerability! Multiple rapid requests can cause unexpected behavior.',
                        'bug_type': 'Race Condition'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': 0,
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{race_condition_saved_{user.id}_{post_id}}}",
                        'description': 'You already found this race condition vulnerability.',
                        'bug_type': 'Race Condition'
                    }, status=status.HTTP_200_OK)
            
            # Normal save/unsave logic (intentionally vulnerable to race conditions)
            save_obj, created = Save.objects.get_or_create(user=user, post=post)
            
            if not created:
                # Post was already saved, so unsave it
                save_obj.delete()
                saved = False
                message = 'Post unsaved'
            else:
                # Post was not saved, so save it
                saved = True
                message = 'Post saved'
                
                # Create notification for post owner (if different user)
                if post.user != user:
                    create_notification(
                        receiver=post.user,
                        sender=user,
                        notification_type='save',
                        post=post
                    )
            
            return Response({
                'saved': saved,
                'message': message,
                'post_id': post_id
            }, status=status.HTTP_200_OK)
            
        except Post.DoesNotExist:
            return Response({
                'error': 'Post not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in SavePostView: {e}")
            return Response({
                'error': 'Failed to save/unsave post'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserSavedPostsView(APIView):
    """
    Get posts saved by the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get saved posts for the user
        saved_posts = Post.objects.filter(
            saves__user=user
        ).order_by('-saves__created_at')
        
        # Serialize posts with context
        serializer = PostSerializer(
            saved_posts, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'results': serializer.data,
            'count': saved_posts.count()
        }, status=status.HTTP_200_OK)


class UserMyPostsView(APIView):
    """
    Get non-private posts created by the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get non-private posts by this user
        posts = Post.objects.filter(
            user=user,
            is_private=False
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


class UserPrivatePostsView(APIView):
    """
    Get private posts created by the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get private posts by this user
        posts = Post.objects.filter(
            user=user,
            is_private=True
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


def detect_xss_attempt(text):
    """
    Detect XSS attempts in user input without executing them.
    Returns True if XSS patterns are found.
    """
    import re
    
    # Common XSS patterns to detect
    xss_patterns = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'<script[^>]*>',             # Opening script tags
        r'javascript:',               # JavaScript protocol
        r'on\w+\s*=',                # Event handlers (onclick, onload, etc.)
        r'<iframe[^>]*>',             # Iframe tags
        r'<object[^>]*>',             # Object tags
        r'<embed[^>]*>',              # Embed tags
        r'<svg[^>]*>.*?</svg>',       # SVG with potential scripts
        r'<img[^>]*on\w+',            # Image with event handlers
        r'eval\s*\(',                 # eval() function
        r'alert\s*\(',                # alert() function
        r'confirm\s*\(',              # confirm() function
        r'prompt\s*\(',               # prompt() function
    ]
    
    # Check for XSS patterns (case-insensitive)
    for pattern in xss_patterns:
        if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
            return True
    
    return False


def sanitize_comment_text(text):
    """
    Sanitize comment text by removing dangerous HTML/JS while preserving safe content.
    """
    import html
    import re
    
    # HTML encode the text to prevent XSS execution
    sanitized = html.escape(text)
    
    # Remove any remaining script-like patterns
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '[REMOVED: SCRIPT]', sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'javascript:', '[REMOVED: JAVASCRIPT]', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '[REMOVED: EVENT]', sanitized, flags=re.IGNORECASE)
    
    return sanitized


def detect_sql_injection_attempt(search_query):
    """
    Detect SQL injection attempts in user input without executing them.
    Returns True if SQL injection patterns are found.
    """
    import re
    
    # Normalize the input for better pattern matching
    normalized_query = search_query.strip().upper()
    
    # Common SQL injection patterns to detect
    sql_injection_patterns = [
        # Basic SQL injection patterns with quotes
        r"'\s*(OR|AND)\s+\d+\s*=\s*\d+",           # ' OR 1=1, ' AND 1=1
        r"'\s*(OR|AND)\s+\w+\s*=\s*\w+",           # ' OR user=user
        r"'\s*(OR|AND)\s+'\w+'\s*=\s*'\w+'",       # ' OR 'a'='a'
        r"'\s*(OR|AND)\s+'1'\s*=\s*'1'",           # ' OR '1'='1'
        
        # SQL commands that could be dangerous (with or without quotes/semicolons)
        r"(^|\s|'|;)\s*DROP\s+TABLE",              # DROP TABLE (standalone or after delimiter)
        r"(^|\s|'|;)\s*DELETE\s+FROM",             # DELETE FROM
        r"(^|\s|'|;)\s*INSERT\s+INTO",             # INSERT INTO
        r"(^|\s|'|;)\s*UPDATE\s+\w+\s+SET",        # UPDATE table SET
        r"(^|\s|'|;)\s*ALTER\s+TABLE",             # ALTER TABLE
        r"(^|\s|'|;)\s*CREATE\s+TABLE",            # CREATE TABLE
        r"(^|\s|'|;)\s*TRUNCATE\s+TABLE",          # TRUNCATE TABLE
        
        # UNION-based injection
        r"'\s*UNION\s+SELECT",                      # ' UNION SELECT
        r"(^|\s)\s*UNION\s+SELECT",                 # UNION SELECT (standalone)
        
        # Comment-based injection
        r"'\s*--",                                  # SQL comment --
        r"'\s*/\*.*?\*/",                          # SQL comment /* */
        r"'\s*#",                                  # MySQL comment #
        r"--\s",                                   # SQL comment (standalone)
        r"/\*.*?\*/",                              # SQL comment block (standalone)
        
        # Function-based injection
        r"\bEXEC\s*\(",                            # EXEC function
        r"\bsp_\w+",                               # Stored procedures
        r"xp_cmdshell",                            # Command execution
        r"INTO\s+OUTFILE",                         # File operations
        r"LOAD_FILE\s*\(",                         # File reading
        r"BENCHMARK\s*\(",                         # Time-based injection
        r"SLEEP\s*\(",                             # Time-based injection
        r"WAITFOR\s+DELAY",                        # SQL Server delay
        r"pg_sleep",                               # PostgreSQL sleep
        r"EXTRACTVALUE\s*\(",                      # Error-based injection
        r"UPDATEXML\s*\(",                         # Error-based injection
        
        # Advanced patterns
        r"'\s*(AND|OR)\s+\w+\s+LIKE\s+",           # LIKE-based injection
        r"'\s*(AND|OR)\s+SUBSTRING\s*\(",          # Substring-based injection
        r"'\s*(AND|OR)\s+ASCII\s*\(",              # ASCII-based injection
        r"'\s*(AND|OR)\s+CHAR\s*\(",               # Character-based injection
        r"'\s*(AND|OR)\s+CONCAT\s*\(",             # Concatenation-based injection
        
        # Database-specific functions
        r"@@version",                              # SQL Server version
        r"version\s*\(\s*\)",                      # MySQL/PostgreSQL version
        r"user\s*\(\s*\)",                         # Current user function
        r"database\s*\(\s*\)",                     # Current database function
        r"information_schema",                     # SQL Server system objects
        r"sysobjects",                             # SQL Server system users
        
        # Hex/URL encoded patterns
        r"0x[0-9a-fA-F]+",                         # Hexadecimal values
        r"%27",                                    # URL encoded single quote
        r"%3B",                                    # URL encoded semicolon
        r"%2D%2D",                                 # URL encoded --
        
        # Boolean-based blind injection
        r"'\s*(AND|OR)\s+\d+\s*[<>]\s*\d+",       # ' AND 1>0
        r"'\s*(AND|OR)\s+\w+\s+IS\s+(NOT\s+)?NULL", # ' AND username IS NULL
        
        # Time-based blind injection patterns
        r"IF\s*\(.+SLEEP\s*\(",                    # IF condition with SLEEP
        r"CASE\s+WHEN.+THEN\s+SLEEP",             # CASE WHEN with SLEEP
        
        # Error-based injection patterns
        r"'\s*AND\s+\(\s*SELECT\s+COUNT\s*\(\s*\*\s*\)", # Error-based count injection
        r"'\s*AND\s+EXP\s*\(\s*~\s*\(",           # MySQL error-based with EXP
        
        # Stacked queries
        r";\s*EXEC\s*\(",                          # Stacked execution
        r";\s*SELECT\s+",                          # Stacked SELECT
        r";\s*INSERT\s+",                          # Stacked INSERT
        r";\s*UPDATE\s+",                          # Stacked UPDATE
        r";\s*DELETE\s+",                          # Stacked DELETE
    ]
    
    # Check for SQL injection patterns (case-insensitive)
    for pattern in sql_injection_patterns:
        if re.search(pattern, search_query, re.IGNORECASE | re.DOTALL):
            return True
    
    # Additional check for common standalone SQL keywords that shouldn't appear in usernames
    dangerous_keywords = [
        'DROP TABLE', 'DELETE FROM', 'UPDATE SET', 'INSERT INTO', 'ALTER TABLE',
        'CREATE TABLE', 'TRUNCATE TABLE', 'UNION SELECT', 'EXEC(', 'XP_CMDSHELL',
        'LOAD_FILE(', 'INTO OUTFILE', 'BENCHMARK(', 'SLEEP(', 'WAITFOR DELAY',
        'PG_SLEEP', 'EXTRACTVALUE(', 'UPDATEXML('
    ]
    
    for keyword in dangerous_keywords:
        if keyword in normalized_query:
            return True
    
    return False


def detect_xpath_injection_attempt(search_query):
    """
    Detect XPath injection attempts in user input without executing them.
    Returns True if XPath injection patterns are found.
    """
    import re
    
    # Normalize the input for better pattern matching
    normalized_query = search_query.strip()
    
    # Common XPath injection patterns to detect
    xpath_injection_patterns = [
        # Basic XPath injection patterns with quotes
        r"'\s*(or|and)\s+\d+\s*=\s*\d+",                    # ' or 1=1, ' and 1=1
        r"'\s*(or|and)\s+'\w+'\s*=\s*'\w+'",               # ' or 'a'='a'
        r"'\s*(or|and)\s+'1'\s*=\s*'1'",                   # ' or '1'='1'
        r"'\s*(or|and)\s+true\(\s*\)",                      # ' or true()
        r"'\s*(or|and)\s+false\(\s*\)",                     # ' or false()
        
        # XPath injection without quotes
        r"\s+(or|and)\s+\d+\s*=\s*\d+",                    # or 1=1, and 1=1
        r"\s+(or|and)\s+true\(\s*\)",                       # or true()
        r"\s+(or|and)\s+false\(\s*\)",                      # or false()
        r"\s+(or|and)\s+not\(\s*\)",                        # or not()
        
        # XPath functions and operators
        r"contains\s*\(",                                   # contains() function
        r"starts-with\s*\(",                               # starts-with() function
        r"substring\s*\(",                                  # substring() function
        r"string-length\s*\(",                             # string-length() function
        r"normalize-space\s*\(",                           # normalize-space() function
        r"position\s*\(\s*\)",                             # position() function
        r"last\s*\(\s*\)",                                 # last() function
        r"count\s*\(",                                     # count() function
        r"sum\s*\(",                                       # sum() function
        r"floor\s*\(",                                     # floor() function
        r"ceiling\s*\(",                                   # ceiling() function
        r"round\s*\(",                                     # round() function
        
        # XPath axes
        r"ancestor::",                                      # ancestor axis
        r"ancestor-or-self::",                             # ancestor-or-self axis
        r"child::",                                        # child axis
        r"descendant::",                                   # descendant axis
        r"descendant-or-self::",                           # descendant-or-self axis
        r"following::",                                    # following axis
        r"following-sibling::",                            # following-sibling axis
        r"parent::",                                       # parent axis
        r"preceding::",                                    # preceding axis
        r"preceding-sibling::",                            # preceding-sibling axis
        r"self::",                                         # self axis
        
        # XPath node tests
        r"node\s*\(\s*\)",                                 # node() test
        r"text\s*\(\s*\)",                                 # text() test
        r"comment\s*\(\s*\)",                              # comment() test
        r"processing-instruction\s*\(",                    # processing-instruction() test
        
        # XPath wildcards and special characters
        r"\*",                                             # wildcard *
        r"//",                                             # descendant-or-self shorthand
        r"\.\.",                                           # parent node shorthand
        r"\.",                                             # current node shorthand
        
        # XPath predicates and filters
        r"\[.*\]",                                         # predicate expressions
        r"@\w+",                                           # attribute references
        
        # Boolean operators in XPath context
        r"'\s*(or|and)\s+",                                # Boolean operators with quotes
        r"\s+(or|and)\s+.*=",                             # Boolean operators with comparisons
        
        # XPath string functions
        r"concat\s*\(",                                    # concat() function
        r"translate\s*\(",                                 # translate() function
        
        # Error-based XPath injection
        r"'\s*(or|and)\s+1\s*div\s*0",                    # Division by zero
        r"'\s*(or|and)\s+\w+\s*div\s*0",                  # Division by zero with variables
        
        # Time-based blind XPath injection (theoretical)
        r"'\s*(or|and).*sleep\s*\(",                      # Sleep-like functions (if available)
        
        # Document structure manipulation
        r"document\s*\(",                                  # document() function
        r"system-property\s*\(",                          # system-property() function
        
        # Advanced XPath patterns
        r"'\s*(or|and)\s+.*\[\s*\d+\s*\]",               # Array/position access
        r"'\s*(or|and)\s+.*namespace::",                  # Namespace usage
    ]
    
    # Check for XPath injection patterns (case-insensitive)
    for pattern in xpath_injection_patterns:
        if re.search(pattern, search_query, re.IGNORECASE):
            return True
    
    # Additional check for common XPath keywords that shouldn't appear in usernames
    dangerous_xpath_keywords = [
        'TRUE()', 'FALSE()', 'CONTAINS(', 'STARTS-WITH(', 'SUBSTRING(',
        'STRING-LENGTH(', 'NORMALIZE-SPACE(', 'POSITION()', 'LAST()',
        'COUNT(', 'SUM(', 'ANCESTOR::', 'DESCENDANT::', 'FOLLOWING::',
        'PRECEDING::', 'NODE()', 'TEXT()', 'COMMENT()', 'CONCAT(',
        'TRANSLATE(', 'DOCUMENT(', 'SYSTEM-PROPERTY('
    ]
    
    normalized_upper = normalized_query.upper()
    for keyword in dangerous_xpath_keywords:
        if keyword in normalized_upper:
            return True
    
    return False


class VulnerableUserSearchView(APIView):
    """
    🚨 VULNERABLE ENDPOINT: XPath and SQL Injection in User Search
    
    This endpoint is intentionally vulnerable to both XPath and SQL injection for educational purposes.
    It detects injection attempts and awards CTF points instead of executing them.
    
    Expected exploit attempts:
    GET /api/users/?search=' OR 1=1 --     (SQL injection)
    GET /api/users/?search=' or '1'='1'   (XPath injection)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        search_query = request.query_params.get('search', '')
        
        if not search_query:
            return Response({
                'results': [],
                'count': 0,
                'message': 'Search query is required.'
            }, status=status.HTTP_200_OK)
        
        # Check for XPath injection attempts FIRST (higher priority)
        if detect_xpath_injection_attempt(search_query):
            # XPath injection attempt detected!
            logger.warning(f"[CTF] XPath injection attempt detected from user {request.user.id if request.user.is_authenticated else 'Anonymous'}: {search_query}")
            
            if request.user.is_authenticated:
                # Trigger CTF bug detection
                bug_response = trigger_bug_found(
                    user=request.user,
                    bug_title="XPath Injection in Find Friends",
                    points=125  # Higher points for XPath injection (rarer vulnerability)
                )
                
                if bug_response['success']:
                    # First time finding this bug - return CTF response
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{xpath_injection_find_friends_{request.user.id}}}",
                        'description': 'You discovered an XPath injection vulnerability in the Find Friends search! This could allow attackers to bypass authentication or access unauthorized data.',
                        'bug_type': 'XPath Injection',
                        'attempted_payload': search_query[:100] + '...' if len(search_query) > 100 else search_query,
                        'results': [],
                        'count': 0
                    }, status=status.HTTP_200_OK)
                else:
                    # Already found this bug
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': 0,
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{xpath_injection_find_friends_{request.user.id}}}",
                        'description': 'XPath injection attempt detected, but you already found this vulnerability.',
                        'bug_type': 'XPath Injection',
                        'attempted_payload': search_query[:100] + '...' if len(search_query) > 100 else search_query,
                        'results': [],
                        'count': 0
                    }, status=status.HTTP_200_OK)
            else:
                # Anonymous user attempted XPath injection
                return Response({
                    'error': 'Invalid search query. Please login to continue.',
                    'message': 'XPath injection attempts are logged.',
                    'results': [],
                    'count': 0
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for SQL injection attempts SECOND (if no XPath injection detected)
        elif detect_sql_injection_attempt(search_query):
            # SQL injection attempt detected!
            logger.warning(f"[CTF] SQL injection attempt detected from user {request.user.id if request.user.is_authenticated else 'Anonymous'}: {search_query}")
            
            if request.user.is_authenticated:
                # Trigger CTF bug detection
                bug_response = trigger_bug_found(
                    user=request.user,
                    bug_title="SQL Injection in User Search",
                    points=100  # High points for SQL injection
                )
                
                if bug_response['success']:
                    # First time finding this bug - return CTF response
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': bug_response['points_awarded'],
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{sql_injection_user_search_{request.user.id}}}",
                        'description': 'You discovered a SQL injection vulnerability in the user search! This could allow attackers to access or manipulate database data.',
                        'bug_type': 'SQL Injection',
                        'attempted_payload': search_query[:100] + '...' if len(search_query) > 100 else search_query,
                        'results': [],
                        'count': 0
                    }, status=status.HTTP_200_OK)
                else:
                    # Already found this bug
                    return Response({
                        'vulnerability_detected': True,
                        'ctf_message': bug_response['message'],
                        'ctf_points_awarded': 0,
                        'ctf_total_points': bug_response['total_points'],
                        'flag': f"CTF{{sql_injection_user_search_{request.user.id}}}",
                        'description': 'SQL injection attempt detected, but you already found this vulnerability.',
                        'bug_type': 'SQL Injection',
                        'attempted_payload': search_query[:100] + '...' if len(search_query) > 100 else search_query,
                        'results': [],
                        'count': 0
                    }, status=status.HTTP_200_OK)
            else:
                # Anonymous user attempted SQL injection
                return Response({
                    'error': 'Invalid search query. Please login to continue.',
                    'message': 'SQL injection attempts are logged.',
                    'results': [],
                    'count': 0
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normal search functionality (safe parameterized query)
        try:
            # Use Django ORM for safe querying (prevents actual injection)
            users = User.objects.filter(
                username__icontains=search_query
            ).exclude(
                id=request.user.id if request.user.is_authenticated else None
            )[:10]
            
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
                'count': len(results),
                'search_query': search_query
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in user search: {e}")
            return Response({
                'error': 'Search failed. Please try again.',
                'results': [],
                'count': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForgotPasswordView(APIView):
    """
    🚨 VULNERABLE ENDPOINT: Predictable Password Reset Tokens
    
    This endpoint generates password reset tokens that contain predictable patterns.
    The token format is: {random_id}-{base64_encoded_username}
    
    While the random_id part is secure, the username part makes tokens predictable
    if an attacker knows the username, allowing them to potentially reset other users' passwords.
    
    Expected exploit:
    1. Request password reset for victim's email
    2. Extract the token format from your own reset email
    3. Generate a token for the victim by encoding their username
    4. Use the crafted token to reset victim's password
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response({
                'error': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists - return success anyway for security
            return Response({
                'message': 'If an account with this email exists, a password reset link has been sent.',
                'email': email
            }, status=status.HTTP_200_OK)
        
        # VULNERABILITY: Generate predictable token
        # Format: {random_id}-{base64_encoded_username}
        random_id = secrets.token_urlsafe(16)  # This part is secure
        username_b64 = base64.b64encode(user.username.encode()).decode()  # This part is predictable!
        
        # The full token combines both parts
        reset_token = f"{random_id}-{username_b64}"
        
        # Store the token in cache for 1 hour
        cache_key = f"password_reset_{reset_token}"
        cache.set(cache_key, {
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'timestamp': time.time()
        }, 3600)  # 1 hour expiry
        
        # Generate reset URL
        reset_url = f"http://localhost:5173/reset-password/{username_b64}/{reset_token}"
        
        # Send email (print to console in development)
        try:
            print(f"\n🔑 PASSWORD RESET LINK for {user.email}:")
            print(f"📧 User: {user.username} ({user.email})")
            print(f"🔗 Reset Link: {reset_url}")
            print(f"🚨 CTF NOTE: Token format is {random_id}-{username_b64}")
            print(f"⏰ Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 60)
            
            logger.info(f"[CTF] Password reset email sent to {email} with token: {reset_token}")
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return Response({
                'error': 'Failed to send reset email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': 'If an account with this email exists, a password reset link has been sent.',
            'email': email,
            'debug_info': {
                'reset_url': reset_url,
                'token': reset_token,
                'note': 'Debug info visible in development mode only'
            }
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    🚨 VULNERABLE ENDPOINT: Handles password reset with predictable token detection
    
    This endpoint processes password reset requests and detects when someone
    has exploited the predictable token vulnerability.
    
    CTF Detection Logic:
    1. Extract username from the URL parameter (uidb64)
    2. Extract username from the token (base64 part after the dash)
    3. If they don't match, someone crafted a token - trigger CTF bug detection
    4. Award points for discovering the predictable token vulnerability
    """
    permission_classes = [AllowAny]
    
    def post(self, request, uidb64, token):
        new_password = request.data.get('password', '').strip()
        
        if not new_password:
            return Response({
                'error': 'New password is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 6:
            return Response({
                'error': 'Password must be at least 6 characters long.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode the username from URL parameter
            url_username = base64.b64decode(uidb64.encode()).decode()
        except Exception:
            return Response({
                'error': 'Invalid reset link format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if token exists in cache first
        cache_key = f"password_reset_{token}"
        reset_data = cache.get(cache_key)
        
        if not reset_data:
            return Response({
                'error': 'Invalid or expired reset token.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract username from token (predictable part)
        try:
            if '-' not in token:
                logger.warning("[CTF] Invalid token format detected!")
                return Response({
                    'error': 'Invalid token format.',
                    'vulnerability_detected': True,
                    'ctf_message': 'Invalid password reset token format detected! Login to claim your points.',
                    'require_login': True
                }, status=status.HTTP_400_BAD_REQUEST)
            
            token_parts = token.split('-', 1)  # Split on first dash only
            random_part = token_parts[0]
            username_part = token_parts[1]
            
            # Decode the username from token
            token_username = base64.b64decode(username_part.encode()).decode()
            
        except Exception as e:
            logger.error(f"Error decoding token username: {e}")
            return Response({
                'error': 'Invalid token format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"[CTF] Password reset attempt - URL username: {url_username}, Token username: {token_username}, Cache username: {reset_data.get('username')}")
        
        # CTF BUG DETECTION: Check if usernames don't match (token was crafted)
        if url_username != token_username:
            logger.warning(f"[CTF] PREDICTABLE TOKEN VULNERABILITY DETECTED!")
            logger.warning(f"[CTF] URL username: {url_username}, Token username: {token_username}")
            logger.warning(f"[CTF] Someone crafted a token to reset {url_username}'s password using {token_username}'s token pattern!")
            
            # Try to find the user who's attempting this exploit
            current_user = None
            
            # Check if there's an authenticated user making this request
            if hasattr(request, 'user') and request.user.is_authenticated:
                current_user = request.user
                logger.info(f"[CTF] Authenticated user {current_user.username} (ID: {current_user.id}) found the predictable token bug")
            else:
                # If no authenticated user, try to find the user who originally requested the reset
                try:
                    current_user = User.objects.get(username=token_username)
                    logger.info(f"[CTF] Assuming user {current_user.username} found the bug based on token pattern")
                except User.DoesNotExist:
                    logger.error(f"[CTF] Could not identify user who found the bug")
                    return Response({
                        'error': 'Could not verify the exploit attempt. Please login first.',
                        'vulnerability_detected': True,
                        'message': 'Predictable token vulnerability detected but could not award points.',
                        'exploit_details': {
                            'url_username': url_username,
                            'token_username': token_username,
                            'note': 'Token was crafted to target a different user'
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Trigger CTF bug detection
            bug_response = trigger_bug_found(
                user=current_user,
                bug_title="Predictable Password Reset Token",
                points=100
            )
            
            if bug_response['success']:
                # First time finding this bug
                return Response({
                    'vulnerability_detected': True,
                    'ctf_message': bug_response['message'],
                    'ctf_points_awarded': bug_response['points_awarded'],
                    'ctf_total_points': bug_response['total_points'],
                    'flag': f"CTF{{predictable_password_reset_token_{current_user.id}}}",
                    'description': 'You discovered a predictable password reset token vulnerability! The token contains the base64-encoded username, making it possible to craft tokens for other users.',
                    'bug_type': 'Predictable Token Generation',
                    'exploit_details': {
                        'target_username': url_username,
                        'crafted_from_username': token_username,
                        'token_format': 'random_id-base64_username',
                        'security_impact': 'Attackers can reset passwords for any known username'
                    },
                    'message': 'Security vulnerability discovered! Token exploitation prevented.'
                }, status=status.HTTP_200_OK)
            else:
                # Already found this bug
                return Response({
                    'vulnerability_detected': True,
                    'ctf_message': bug_response['message'],
                    'ctf_points_awarded': 0,
                    'ctf_total_points': bug_response['total_points'],
                    'flag': f"CTF{{predictable_password_reset_token_{current_user.id}}}",
                    'description': 'Predictable token vulnerability detected, but you already found this bug.',
                    'bug_type': 'Predictable Token Generation',
                    'message': 'You already discovered this vulnerability.'
                }, status=status.HTTP_200_OK)
        
        # Normal password reset flow (usernames match)
        # Verify the username from the URL matches the one stored with the token in cache
        if reset_data.get('username') != url_username:
            logger.warning(f"[CTF] Token validation failed. URL username '{url_username}' does not match cached username '{reset_data.get('username')}'.")
            return Response({
                'error': 'Token validation failed. Mismatch in user data.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the user and reset password
        try:
            user = User.objects.get(id=reset_data['user_id'])
            user.set_password(new_password)
            user.save()
            
            # Clear the token from cache
            cache.delete(cache_key)
            
            logger.info(f"[CTF] Password successfully reset for user {user.username}")
            
            return Response({
                'message': 'Password has been successfully reset. You can now login with your new password.',
                'username': user.username
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            logger.error(f"[CTF] User not found during password reset: ID {reset_data['user_id']}")
            return Response({
                'error': 'User account not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"[CTF] Error resetting password: {e}")
            return Response({
                'error': 'Failed to reset password. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, uidb64, token):
        """
        Validate reset token without actually resetting password.
        Used by frontend to check if reset link is valid.
        """
        # Check for invalid token format FIRST
        if '-' not in token:
            logger.warning("[CTF] Invalid token format detected!")
            return Response({
                'error': 'Invalid token format.',
                'vulnerability_detected': True,
                'ctf_message': 'Invalid password reset token format detected! Login to claim your points.',
                'require_login': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode the username from URL parameter
            url_username = base64.b64decode(uidb64.encode()).decode()
        except Exception:
            return Response({
                'error': 'Invalid reset link format.',
                'valid': False
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if token exists in cache
        cache_key = f"password_reset_{token}"
        reset_data = cache.get(cache_key)
        
        if not reset_data:
            return Response({
                'error': 'Invalid or expired reset token.',
                'valid': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify the username from the URL (uidb64) matches the username in the cached data
        if reset_data.get('username') != url_username:
            return Response({
                'error': 'Token validation failed. The link may have been tampered with.',
                'valid': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'valid': True,
            'username': reset_data.get('username'),
            'email': reset_data.get('email'),
            'message': 'Reset token is valid.'
        }, status=status.HTTP_200_OK)
