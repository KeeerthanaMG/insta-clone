# InstaCam - Full-Stack Instagram Clone

A modern Instagram-like social media application built with Django REST Framework and React + Vite. Features include user authentication, photo sharing, likes, comments, follow system, messaging, real-time notifications, and **CTF bug bounty gamification** for security education.

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
- ✅ Real-time WebSocket chat messaging
- ✅ CTF bug bounty system with point rewards
- ✅ IDOR vulnerability detection and gamification
- ✅ Leaderboard system for bug hunters

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
- ✅ Real-time chat with WebSocket support
- ✅ CTF flag detection with animated popups
- ✅ Bug bounty point tracking

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

6. **Create CTF test data:**
   ```bash
   python manage.py create_ctf_data
   ```

7. **Start development server with WebSocket support:**
   ```bash
   # For development with WebSocket support
   daphne -p 8000 instaclone.asgi:application
   
   # Alternative: Standard Django server (no WebSocket)
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

## 🎯 CTF Bug Bounty Features

### IDOR Vulnerability in Direct Messages
- **Bug**: Insecure Direct Object Reference in message threads
- **Points**: 100 points
- **How to exploit**: Access a message thread you're not a participant of
- **Detection**: Automatic flag generation when vulnerability is triggered
- **Reward**: Points added to user profile and leaderboard

### Beginner Instructions for Bug Hunting

1. **Create your account:**
   - Go to `http://localhost:5173/register`
   - Create a new account (e.g., username: `hacker`, email: `hacker@test.com`)

2. **Find available thread IDs:**
   - Go to: `http://127.0.0.1:8000/api/debug/threads/`
   - Note the thread IDs that exist but you're not a participant of

3. **Exploit the IDOR vulnerability:**
   - In your browser, go to: `http://localhost:5173/messages/{thread_id}`
   - Replace `{thread_id}` with a real thread ID you're not part of
   - **This is the bug!** You're accessing a conversation you're not part of

4. **Get your flag:**
   - A green popup will appear showing "🎉 Bug Found!"
   - You'll see your flag: `CTF{idor_dm_[your_user_id]_[thread_id]}`
   - You'll earn 100 points automatically

5. **Verify your points:**
   - Go to your profile page (`/profile`)
   - You should see your CTF Points: 100 and Bugs Found: 1

6. **Try again (should fail):**
   - Try accessing the same thread again
   - You'll get a message: "You have already solved this bug"
   - No additional points awarded

### Security Learning Objectives
- Understanding IDOR (Insecure Direct Object Reference) vulnerabilities
- Learning about proper access control implementation
- Gamified approach to security education
- Real-world bug bounty simulation

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
- `GET /api/users/{username}/posts/` - Get posts by specific user
- `GET /api/users/?search=query` - Search users

### CTF/Bug Bounty
- Detection is automatic when vulnerabilities are triggered
- Points are awarded through the standard user endpoints
- Leaderboard accessible through admin panel
- `GET /api/debug/threads/` - Debug endpoint to list all threads (REMOVE IN PRODUCTION)

### Messages/Chat
- `GET /api/messages/threads/` - List chat threads
- `POST /api/messages/start/` - Start new chat thread
- `POST /api/messages/threads/{id}/accept/` - Accept chat request
- `GET /api/messages/threads/{id}/` - Get thread messages (⚠️ IDOR vulnerability)
- `POST /api/messages/threads/{id}/` - Send message to thread
- `WS /ws/chat/{id}/` - WebSocket connection for real-time messaging

## 🎨 Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework** - API development
- **Pillow** - Image processing
- **django-cors-headers** - CORS handling
- **SQLite** - Database (development)
- **Channels** - WebSocket support
- **Daphne** - ASGI server

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

## 🛠️ Development

### WebSocket Development
- WebSocket consumers in `core/consumers.py`
- Routing configuration in `core/routing.py`
- Token-based authentication for WebSocket connections
- Real-time message broadcasting between users

### CTF Features Development
- Bug detection logic in API views
- Point system integrated with user model
- Leaderboard tracking in dedicated model
- Flag generation with unique identifiers

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

### Starting the Development Server

**For full functionality (including WebSocket chat):**
```bash
cd backend
daphne -p 8000 instaclone.asgi:application
```

**For basic functionality (no real-time chat):**
```bash
cd backend
python manage.py runserver
```

## 🎮 Bug Bounty Gameplay

### Current Vulnerabilities
1. **IDOR in Direct Messages** (100 points)
   - Access message threads you're not authorized to view
   - Automatic detection and point award
   - One-time reward per user

### Planned Vulnerabilities
- ✅ XSS in comment system (75 points)
- ✅ SQL injection in search functionality (100 points)  
- Authentication bypass scenarios
- File upload vulnerabilities

### Point System
- Points are tracked per user in their profile
- Leaderboard shows top bug hunters
- Each vulnerability can only be exploited once per user
- No points awarded for repeated exploitation

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
5. **404 on debug endpoint**: Make sure you've added the URL pattern correctly

### Getting Help

- Check the Django and React documentation
- Review API endpoint responses in browser dev tools
- Verify environment variables and configurations
- Use the debug endpoint to see available thread IDs

---

**Happy coding and happy hunting! 🚀🔍**