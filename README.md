# InstaCam - Full-Stack Instagram Clone

A modern Instagram-like social media application built with Django REST Framework and React + Vite. Features include user authentication, photo sharing, likes, comments, follow system, messaging, and real-time notifications with CTF flag detection for bug bounty gamification.

## 📋 Features

### Backend (Django + DRF)
- ✅ User authentication with custom user model
- ✅ Post creation with image upload
- ✅ Like/Save functionality 
- ✅ Comments system with notifications
- ✅ Follow/Unfollow system
- ✅ Real-time notifications for likes, comments, follows
- ✅ Feed filtered by followed users
- ✅ RESTful API endpoints
- ✅ Media file handling
- ✅ CORS configuration
- ✅ Admin panel integration
- ✅ Token-based authentication

### Frontend (React + Vite)
- ✅ Modern React 18 with hooks
- ✅ Instagram-style responsive UI
- ✅ Authentication flow (Login/Register)
- ✅ Feed with post cards and interactions
- ✅ Comments modal with real-time updates
- ✅ Create post with image upload
- ✅ Explore users and search functionality
- ✅ Follow/Unfollow with live counts
- ✅ User profiles with posts grid
- ✅ Messages interface
- ✅ Notifications system with badge
- ✅ Profile management with bio editing
- ✅ CTF flag detection popup
- ✅ Mobile-responsive sidebar
- ✅ Real-time notification polling

## 🏗️ Project Structure

```
insta_cam/
├── backend/              # Django REST API
│   ├── instaclone/      # Main Django project
│   ├── core/            # Core app with models & views
│   ├── requirements.txt # Python dependencies
│   └── manage.py
└── frontend/            # React + Vite frontend
    ├── src/
    │   ├── components/  # Reusable UI components
    │   ├── pages/       # Page components
    │   ├── layouts/     # Layout components
    │   ├── lib/         # API client & utilities
    │   └── utils/       # Helper functions
    ├── package.json
    └── index.html
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup (Django)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```

   Backend will be available at: `http://localhost:8000`
   Admin panel: `http://localhost:8000/admin`
   API endpoints: `http://localhost:8000/api/`

### Frontend Setup (React + Vite)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at: `http://localhost:5173`

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/logout/` - User logout

### Posts
- `GET /api/posts/` - List all posts
- `POST /api/posts/` - Create new post
- `GET /api/posts/{id}/` - Get specific post
- `POST /api/posts/{id}/like/` - Toggle like on post
- `POST /api/posts/{id}/save/` - Toggle save on post

### Comments
- `GET /api/posts/{id}/comments/` - Get post comments
- `POST /api/comments/` - Create comment
- `DELETE /api/comments/{id}/` - Delete comment

### Follow System
- `POST /api/users/{id}/follow/` - Follow user
- `POST /api/users/{id}/unfollow/` - Unfollow user
- `GET /api/feed/` - Get posts from followed users

### Notifications
- `GET /api/notifications/` - List user notifications
- `POST /api/notifications/{id}/read/` - Mark notification as read
- `POST /api/notifications/mark-all-read/` - Mark all as read

### Users
- `GET /api/users/me/` - Current user profile
- `PATCH /api/users/me/` - Update profile
- `GET /api/users/{username}/` - Get user profile
- `GET /api/users/?search=query` - Search users

## 🎨 Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework** - API development
- **Pillow** - Image processing
- **django-cors-headers** - CORS handling
- **SQLite** - Database (development)

### Frontend
- **React 18** - UI framework
- **Vite 7** - Build tool
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Framer Motion** - Animations
- **Axios** - HTTP client

## 🔒 Authentication

The application uses token-based authentication:
- Login returns a token stored in `localStorage`
- Protected routes check for token presence
- API requests include token in Authorization header

## 📱 Responsive Design

- **Desktop**: Fixed sidebar navigation with main content area
- **Mobile**: Collapsible sidebar with top navigation bar
- **Tablet**: Adaptive layout with touch-friendly interactions

## 🎯 CTF Features

- Flag detection in API responses
- Animated flag popup notifications
- Bug bounty gamification elements

## 🛠️ Development

### Backend Development
- Models in `core/models.py`
- API views in `core/views.py`
- URL routing in `core/urls.py`
- Admin configuration in `core/admin.py`

### Frontend Development
- Components in `src/components/`
- Pages in `src/pages/`
- API client in `src/lib/api.js`
- Utilities in `src/utils/`

### Building for Production

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py collectstatic
python manage.py migrate
```

**Frontend:**
```bash
cd frontend
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors**: Ensure backend CORS settings include frontend URL
2. **Media files not loading**: Check MEDIA_URL and MEDIA_ROOT settings
3. **Authentication issues**: Verify token storage and API headers
4. **Build errors**: Check Node.js version compatibility

### Getting Help

- Check the Django and React documentation
- Review API endpoint responses in browser dev tools
- Verify environment variables and configurations

---

**Happy coding! 🚀**