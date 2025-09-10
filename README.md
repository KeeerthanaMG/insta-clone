# InstaCam - Full-Stack Instagram Clone

A modern Instagram-like social media application built with Django REST Framework and React + Vite. Features include user authentication, photo sharing, likes, comments, follow system, messaging, real-time notifications, and more.

## 🚀 How to Run (Local & Production)

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- PostgreSQL (for production)
- Redis (for real-time features)

---

## 🏗️ Backend Setup (Django)

### 1. Clone the repository and navigate to backend:
```bash
cd backend
```

### 2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables:
- Copy `.env.example` to `.env` and fill in your values.
- For local development, use SQLite:
```
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
```
- For production, use PostgreSQL:
```
POSTGRES_ENGINE=django.db.backends.postgresql
POSTGRES_NAME=your_db_name
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=your_db_host
POSTGRES_PORT=5432
```
- Set other values (SECRET_KEY, REDIS_URL, etc.) as needed.

### 5. Run database migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

### 7. Run Redis server (for real-time features):
- Local: `redis-server`
- Production: Use Docker or a managed Redis service

### 8. Start the backend server:
- **Local development:**
    ```bash
    python manage.py runserver
    ```
- **Production (with Daphne):**
    ```bash
    daphne -b 0.0.0.0 -p 8000 instaclone.asgi:application
    ```
- Use a process manager and reverse proxy (nginx) for production deployments.

---

## 🏗️ Frontend Setup (React + Vite)

### 1. Navigate to frontend directory:
```bash
cd frontend
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Start development server:
```bash
npm run dev
```

### 4. Build for production:
```bash
npm run build
```

---

## 🛡️ Production Deployment Notes
- Set `DEBUG=False` in your `.env` for production.
- Use PostgreSQL and Redis in production.
- Serve static and media files via nginx or a cloud storage/CDN.
- Remove any CTF/debug endpoints before deploying.
- Never commit your `.env` file to version control.
- Use HTTPS and proper security headers in production.

---

## 📄 License
MIT License - see LICENSE file for details

---

**Happy coding!**