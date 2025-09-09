from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'comments', views.CommentViewSet, basename='comment')
router.register(r'stats', views.PostStatsView, basename='stats')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/<str:uidb64>/<str:token>/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('auth/reset-password/verify/<str:uidb64>/<str:token>/', views.PasswordResetVerifyView.as_view(), name='reset-password-verify'),
    
    # User endpoints
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/me/posts/', views.MyPostsView.as_view(), name='my-posts'),
    path('users/me/private-posts/', views.PrivatePostsView.as_view(), name='private-posts'),
    path('users/me/saved-posts/', views.SavedPostsView.as_view(), name='saved-posts'),
    # TODO: REMOVE BEFORE PRODUCTION - Internal admin endpoint
    path('users/set_role/', views.SetUserRoleView.as_view(), name='set-user-role'),
    path('users/<str:username>/', views.UserProfileView.as_view(), name='user-profile'),
    path('users/<str:username>/posts/', views.UserPostsView.as_view(), name='user-posts'),
    # VULNERABLE: SQL injection endpoint for CTF
    path('users/', views.VulnerableUserSearchView.as_view(), name='user-search'),
    
    # Follow/Unfollow endpoints
    path('users/<int:user_id>/follow/', views.FollowUserView.as_view(), name='follow-user'),
    path('users/<int:user_id>/unfollow/', views.UnfollowUserView.as_view(), name='unfollow-user'),
    
    # Feed endpoint
    path('feed/', views.FeedView.as_view(), name='feed'),
    
    # Notification endpoints
    path('notifications/', views.NotificationListView.as_view(), name='notifications'),
    path('notifications/<int:notification_id>/read/', views.NotificationReadView.as_view(), name='notification-read'),
    path('notifications/mark-all-read/', views.NotificationMarkAllReadView.as_view(), name='notifications-mark-all-read'),
    
    # Messaging endpoints
    path('messages/threads/', views.ThreadListView.as_view(), name='thread-list'),
    path('messages/start/', views.StartThreadView.as_view(), name='thread-start'),
    path('messages/threads/<int:thread_id>/accept/', views.AcceptThreadView.as_view(), name='thread-accept'),
    # VULNERABLE: IDOR vulnerability in chat messages (CTF)
    path('messages/threads/<int:thread_id>/', views.VulnerableMessageListView.as_view(), name='message-list'),

    # Alternative nested route for comments by post
    path('posts/<int:post_id>/comments/',
         views.CommentViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='post-comments'),

    # Image serving endpoint
    path('posts/image/<int:post_id>/', views.serve_post_image, name='serve-post-image'),
    path('posts/<int:pk>/delete_post/', views.PostViewSet.as_view({'delete': 'delete_post'}), name='delete-post'),
    # Save post endpoint 
    path('posts/<int:post_id>/save/', views.SavePostView.as_view(), name='save-post'),
        
    # Debug endpoint - REMOVE IN PRODUCTION
    path('debug/threads/', views.DebugThreadsView.as_view(), name='debug-threads'),
]
