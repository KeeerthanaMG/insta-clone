from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser, Follow, Post, Like, Comment, Save, 
    Message, Bug, BugSolve, Leaderboard
)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "points", "bugs_solved", "screen_locked", "created_at")
    list_filter = ("screen_locked", "created_at", "is_staff", "is_active")
    search_fields = ("username", "email")
    
    fieldsets = UserAdmin.fieldsets + (
        ("Profile Info", {
            "fields": ("profile_picture", "bio", "points", "bugs_solved", "screen_locked")
        }),
    )


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("follower", "following", "created_at")
    list_filter = ("created_at",)
    search_fields = ("follower__username", "following__username")


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("user", "caption_preview", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "caption")
    
    def caption_preview(self, obj):
        return obj.caption[:50] + "..." if len(obj.caption) > 50 else obj.caption
    caption_preview.short_description = "Caption"


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "text_preview", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "text")
    
    def text_preview(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Comment"


@admin.register(Save)
class SaveAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "receiver", "text_preview", "created_at")
    list_filter = ("created_at",)
    search_fields = ("sender__username", "receiver__username", "text")
    
    def text_preview(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Message"


@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "points", "created_at")
    list_filter = ("category", "points", "created_at")
    search_fields = ("title", "description")


@admin.register(BugSolve)
class BugSolveAdmin(admin.ModelAdmin):
    list_display = ("user", "bug", "solved_at")
    list_filter = ("solved_at", "bug__category")
    search_fields = ("user__username", "bug__title")


@admin.register(Leaderboard)
class LeaderboardAdmin(admin.ModelAdmin):
    list_display = ("user", "total_points", "total_bugs_solved")
    ordering = ("-total_points", "-total_bugs_solved")
    search_fields = ("user__username",)
