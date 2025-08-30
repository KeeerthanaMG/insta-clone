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
    
    # User endpoints
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/<str:username>/', views.UserProfileView.as_view(), name='user-profile'),
    path('users/', views.UserSearchView.as_view(), name='user-search'),
    
    # Alternative nested route for comments by post
    path('posts/<int:post_id>/comments/',
         views.CommentViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='post-comments'),
]
