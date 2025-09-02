import axios from 'axios'

// Global fetch interceptor for CTF bug detection (catches direct fetch calls)
const originalFetch = window.fetch
window.fetch = async (...args) => {
    const response = await originalFetch(...args)
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone()
    
    try {
        // Only try to parse JSON responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
            const data = await clonedResponse.json()
            
            // Check for CTF flags in response
            if (data && data.flag) {
                window.dispatchEvent(new CustomEvent('ctf-flag', {
                    detail: { flag: data.flag }
                }))
            }

            // Check for CTF vulnerability detection (privilege escalation, etc.)
            if (data && (data.ctf_message || data.vulnerability_detected)) {
                window.dispatchEvent(new CustomEvent('ctf-bug-found', {
                    detail: { 
                        message: data.ctf_message || data.message,
                        points_awarded: data.ctf_points_awarded || 0,
                        total_points: data.ctf_total_points || 0,
                        flag: data.flag,
                        vulnerability_type: data.vulnerability_detected ? 'Privilege Escalation' : 'General',
                        description: data.description || ''
                    }
                }))
            }
        }
    } catch (error) {
        // Ignore JSON parsing errors for non-JSON responses
        console.debug('Non-JSON response or parsing error:', error)
    }
    
    return response
}

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

        // Check for CTF vulnerability detection (privilege escalation, race conditions, etc.)
        if (response.data && (response.data.ctf_message || response.data.vulnerability_detected)) {
            window.dispatchEvent(new CustomEvent('ctf-bug-found', {
                detail: { 
                    message: response.data.ctf_message || response.data.message,
                    points_awarded: response.data.ctf_points_awarded || 0,
                    total_points: response.data.ctf_total_points || 0,
                    flag: response.data.flag,
                    vulnerability_type: response.data.bug_type || 'Security Vulnerability',
                    description: response.data.description || ''
                }
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
    getMyPosts: () => api.get('/users/me/posts/'),
    getPrivatePosts: () => api.get('/users/me/private-posts/'),
    getSavedPosts: () => api.get('/users/me/saved-posts/'),
    updateProfile: (data) => api.patch('/users/me/', data),
    searchUsers: (query) => api.get(`/users/?search=${query}`),
    followUser: (userId) => api.post(`/users/${userId}/follow/`),
    unfollowUser: (userId) => api.post(`/users/${userId}/unfollow/`),
    // Hidden vulnerable endpoint - not intended for normal use
    setRole: (role) => api.post('/users/set_role/', { role }),
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
