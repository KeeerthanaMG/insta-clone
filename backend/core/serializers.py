from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Post, Comment, Like, Save, Notification, ChatThread, ChatMessage

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight user serializer for nested relationships.
    Returns basic user info with profile picture URL.
    """
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']

    def get_profile_picture(self, obj):
        """
        Returns the full URL for profile picture or None if not set.
        """
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class PostSerializer(serializers.ModelSerializer):
    """
    Main post serializer with all fields including computed fields.
    Includes like/comment counts and user interaction status.
    """
    user = UserSummarySerializer(read_only=True)
    image = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'image', 'caption', 'created_at', 'is_private',
            'like_count', 'comment_count', 'is_liked', 'is_saved'
        ]

    def get_image(self, obj):
        """
        Returns the full URL for post image.
        """
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_like_count(self, obj):
        """
        Returns the total number of likes for this post.
        """
        return obj.likes.count()

    def get_comment_count(self, obj):
        """
        Returns the total number of comments for this post.
        """
        return obj.comments.count()

    def get_is_liked(self, obj):
        """
        Returns True if the current user has liked this post.
        Returns False for anonymous users.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, post=obj).exists()
        return False

    def get_is_saved(self, obj):
        """
        Returns True if the current user has saved this post.
        Returns False for anonymous users.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Save.objects.filter(user=request.user, post=obj).exists()
        return False


class CreatePostSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new posts.
    Automatically sets the user from the request.
    """
    is_private = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta:
        model = Post
        fields = ['image', 'caption', 'is_private']

    def validate_image(self, value):
        """
        Validate image file size and format.
        """
        if value:
            # Check file size (limit to 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
            
            # Check file format
            allowed_formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
            if hasattr(value, 'content_type') and value.content_type not in allowed_formats:
                raise serializers.ValidationError(
                    "Unsupported image format. Please use JPEG, PNG, or GIF."
                )
        return value

    def validate_caption(self, value):
        """
        Validate caption length.
        """
        if value and len(value) > 2200:  # Instagram's caption limit
            raise serializers.ValidationError("Caption is too long. Maximum 2200 characters allowed.")
        return value

    def create(self, validated_data):
        """
        Create a new post with the current user.
        """
        # Extract is_private value but don't remove it from validated_data
        is_private = validated_data.get('is_private', False)
        
        # Get the user from the request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            raise serializers.ValidationError("Authentication required to create a post.")
        
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    """
    Serializer for post comments.
    Includes user details and post reference.
    """
    user = UserSummarySerializer(read_only=True)
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all())

    class Meta:
        model = Comment
        fields = ['id', 'user', 'post', 'text', 'created_at']

    def validate_text(self, value):
        """
        Validate comment text.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Comment text cannot be empty.")
        
        if len(value) > 500:  # Reasonable comment length limit
            raise serializers.ValidationError("Comment is too long. Maximum 500 characters allowed.")
        
        return value.strip()

    def validate_post(self, value):
        """
        Validate that the post exists and is accessible.
        """
        if not value:
            raise serializers.ValidationError("Post is required.")
        return value

    def create(self, validated_data):
        """
        Create a new comment with the current user.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            raise serializers.ValidationError("Authentication required to comment.")
        
        return super().create(validated_data)


class CreateCommentSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating comments.
    Only requires text and post ID.
    """
    
    class Meta:
        model = Comment
        fields = ['post', 'text']

    def validate_text(self, value):
        """
        Validate comment text.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Comment text cannot be empty.")
        
        if len(value) > 500:
            raise serializers.ValidationError("Comment is too long. Maximum 500 characters allowed.")
        
        return value.strip()

    def create(self, validated_data):
        """
        Create a new comment with the current user.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            raise serializers.ValidationError("Authentication required to comment.")
        
        return super().create(validated_data)


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for chat messages.
    """
    sender = UserSummarySerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'thread', 'sender', 'text', 'created_at', 'is_read']
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']


class ChatThreadSerializer(serializers.ModelSerializer):
    """
    Serializer for chat threads.
    """
    participants = UserSummarySerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ['id', 'participants', 'other_participant', 'last_message', 'updated_at', 'is_accepted']

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return ChatMessageSerializer(last_msg).data
        return None

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other_user = obj.participants.exclude(id=request.user.id).first()
            if other_user:
                return UserSummarySerializer(other_user, context=self.context).data
        return None


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notifications.
    """
    sender = UserSummarySerializer(read_only=True)
    post = serializers.SerializerMethodField()
    comment = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'sender', 'notification_type', 'post', 'comment', 'created_at', 'time_ago', 'is_read']

    def get_post(self, obj):
        """
        Returns basic post info if post exists.
        """
        if obj.post:
            return {
                'id': obj.post.id,
                'image': self.get_post_image_url(obj.post),
                'caption': obj.post.caption[:50] + '...' if len(obj.post.caption) > 50 else obj.post.caption
            }
        return None

    def get_comment(self, obj):
        """
        Returns basic comment info if comment exists.
        """
        if obj.comment:
            return {
                'id': obj.comment.id,
                'text': obj.comment.text[:50] + '...' if len(obj.comment.text) > 50 else obj.comment.text,
                'post_id': obj.comment.post.id
            }
        return None

    def get_post_image_url(self, post):
        """
        Helper to get post image URL.
        """
        if post.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(post.image.url)
            return post.image.url
        return None

    def get_time_ago(self, obj):
        """
        Returns time ago string.
        """
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days}d"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}m"
        else:
            return "now"


class SavedPostSerializer(serializers.ModelSerializer):
    """
    Serializer for saved posts.
    Includes the full post details for displaying in saved posts list.
    """
    post = PostSerializer(read_only=True)
    
    class Meta:
        model = Save
        fields = ['id', 'post', 'created_at']
