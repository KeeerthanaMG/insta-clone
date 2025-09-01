from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Post, Comment, Like, Save, Notification

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
            'id', 'user', 'image', 'caption', 'created_at',
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
        # Remove is_private from validated_data as it's not a model field
        validated_data.pop('is_private', None)
        
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


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notifications.
    """
    actor = UserSummarySerializer(read_only=True)
    target_post = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'actor', 'verb', 'target_post', 'created_at', 'time_ago', 'is_read']

    def get_target_post(self, obj):
        """
        Returns basic post info if target_post exists.
        """
        if obj.target_post:
            return {
                'id': obj.target_post.id,
                'image': self.get_post_image_url(obj.target_post),
                'caption': obj.target_post.caption[:50] + '...' if len(obj.target_post.caption) > 50 else obj.target_post.caption
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
