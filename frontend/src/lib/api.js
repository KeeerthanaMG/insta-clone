import axios from 'axios'

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor for authentication
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            // Django REST Framework Token Authentication expects 'Token <key>' format
            config.headers.Authorization = `Token ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor for flag detection and error handling
api.interceptors.response.use(
    (response) => {
        // Check for CTF flags in response
        if (response.data && response.data.flag) {
            window.dispatchEvent(new CustomEvent('ctf-flag', {
                detail: { flag: response.data.flag }
            }))
        }

        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            // Clear invalid token and redirect to login
            localStorage.removeItem('token')
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

// API endpoints
export const authAPI = {
    login: (credentials) => api.post('/auth/login/', credentials),
    register: (userData) => api.post('/auth/register/', userData),
    logout: () => api.post('/auth/logout/'),
}

export const postsAPI = {
    getPosts: () => api.get('/posts/'),
    getPost: (id) => api.get(`/posts/${id}/`),
    createPost: (formData) => api.post('/posts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    likePost: (id) => api.post(`/posts/${id}/like/`),
    savePost: (id) => api.post(`/posts/${id}/save/`),
}

export const usersAPI = {
    getProfile: (username) => api.get(`/users/${username || 'me'}/`),
    getUserPosts: (username) => api.get(`/users/${username}/posts/`),
    updateProfile: (data) => api.patch('/users/me/', data),
    searchUsers: (query) => api.get(`/users/?search=${query}`),
    followUser: (userId) => api.post(`/users/${userId}/follow/`),
    unfollowUser: (userId) => api.post(`/users/${userId}/unfollow/`),
}

export const commentsAPI = {
    getComments: (postId) => api.get(`/posts/${postId}/comments/`),
    createComment: (data) => api.post('/comments/', data),
}

export const messagesAPI = {
    getThreads: () => api.get('/messages/threads/'),
    startThread: (receiverId) => api.post('/messages/start/', { receiver_id: receiverId }),
    acceptThread: (threadId) => api.post(`/messages/threads/${threadId}/accept/`),
    getMessages: (threadId) => api.get(`/messages/threads/${threadId}/`),
    createMessage: (threadId, text) => api.post(`/messages/threads/${threadId}/`, { text }),
}

export const notificationsAPI = {
    getNotifications: () => api.get('/notifications/'),
    markAsRead: (notificationId) => api.post(`/notifications/${notificationId}/read/`),
    markAllAsRead: () => api.post('/notifications/mark-all-read/'),
}

export const feedAPI = {
    getFeed: () => api.get('/feed/'),
}

export default api
