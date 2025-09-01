from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    bio = models.TextField(blank=True)
    points = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    bugs_solved = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    screen_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class Follow(models.Model):
    follower = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="following"
    )
    following = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="followers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("follower", "following")
        constraints = [
            models.CheckConstraint(
                check=~models.Q(follower=models.F("following")),
                name="prevent_self_follow"
            )
        ]

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class Post(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="posts")
    image = models.ImageField(upload_to="posts/")
    caption = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post by {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"


class Like(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="likes")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")

    def __str__(self):
        return f"{self.user.username} likes post {self.post.id}"


class Comment(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="comments")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user.username} on post {self.post.id}"


class Save(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="saved_posts")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="saves")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")

    def __str__(self):
        return f"{self.user.username} saved post {self.post.id}"


class Message(models.Model):
    sender = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="sent_messages"
    )
    receiver = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="received_messages"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(sender=models.F("receiver")),
                name="prevent_self_message"
            )
        ]

    def __str__(self):
        return f"Message from {self.sender.username} to {self.receiver.username}"


class Bug(models.Model):
    CATEGORY_CHOICES = [
        ("security", "Security"),
        ("ui_ux", "UI/UX"),
        ("performance", "Performance"),
        ("functionality", "Functionality"),
        ("compatibility", "Compatibility"),
        ("other", "Other"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    points = models.IntegerField(validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.points} points)"


class BugSolve(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="bug_solves")
    bug = models.ForeignKey(Bug, on_delete=models.CASCADE, related_name="solves")
    solved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "bug")

    def __str__(self):
        return f"{self.user.username} solved {self.bug.title}"

    def save(self, *args, **kwargs):
        # Update user points and bugs_solved count when a bug is solved
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            self.user.points += self.bug.points
            self.user.bugs_solved += 1
            self.user.save()


class Leaderboard(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="leaderboard")
    total_points = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    total_bugs_solved = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ["-total_points", "-total_bugs_solved"]

    def __str__(self):
        return f"{self.user.username} - {self.total_points} points"

    def update_stats(self):
        """Update leaderboard stats from user model"""
        self.total_points = self.user.points
        self.total_bugs_solved = self.user.bugs_solved
        self.save()


class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
    ]
    
    sender = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="sent_notifications"
    )
    receiver = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="received_notifications"
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    post = models.ForeignKey(
        Post, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name="notifications"
    )
    comment = models.ForeignKey(
        Comment, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name="notifications"
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        if self.post:
            return f"{self.sender.username} {self.notification_type}d {self.receiver.username}'s post"
        elif self.comment:
            return f"{self.sender.username} {self.notification_type}d {self.receiver.username}'s comment"
        else:
            return f"{self.sender.username} {self.notification_type}ed {self.receiver.username}"
