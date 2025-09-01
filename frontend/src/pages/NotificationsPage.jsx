import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, Camera } from 'lucide-react'
import { notificationsAPI } from '../lib/api'
import Avatar from '../components/Avatar'
import { formatTimeAgo } from '../utils/timeAgo'

const NotificationsPage = () => {
    const [filter, setFilter] = useState('all')
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const response = await notificationsAPI.getNotifications()
            setNotifications(response.data.results || [])
            setUnreadCount(response.data.unread_count || 0)
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead()
            setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Error marking notifications as read:', error)
        }
    }

    const handleNotificationClick = async (notification) => {
        // Mark as read if not already
        if (!notification.is_read) {
            try {
                await notificationsAPI.markAsRead(notification.id)
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === notification.id
                            ? { ...notif, is_read: true }
                            : notif
                    )
                )
                setUnreadCount(prev => Math.max(0, prev - 1))
            } catch (error) {
                console.error('Error marking notification as read:', error)
            }
        }

        // Navigate based on notification type
        if (notification.post) {
            // For post-related notifications, navigate to feed
            navigate('/feed')
        } else if (notification.notification_type === 'follow') {
            // Navigate to the sender's profile
            navigate(`/profile/${notification.sender.username}`)
        }
    }

    const getNotificationIcon = (notificationType) => {
        switch (notificationType) {
            case 'like':
                return <Heart className="h-6 w-6 text-red-500" />
            case 'comment':
                return <MessageCircle className="h-6 w-6 text-blue-500" />
            case 'follow':
                return <UserPlus className="h-6 w-6 text-green-500" />
            default:
                return <Camera className="h-6 w-6 text-gray-500" />
        }
    }

    const getNotificationText = (notification) => {
        switch (notification.notification_type) {
            case 'like':
                return 'liked your post'
            case 'comment':
                return 'commented on your post'
            case 'follow':
                return 'started following you'
            default:
                return 'interacted with your content'
        }
    }

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'all') return true
        if (filter === 'unread') return !notification.is_read
        return notification.notification_type === filter
    })

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex space-x-3 animate-pulse">
                                <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        {[
                            {
                                key: 'all',
                                label: 'All'
                            },
                            {
                                key: 'unread',
                                label: 'Unread'
                            },
                            {
                                key: 'like',
                                label: 'Likes'
                            },
                            {
                                key: 'comment',
                                label: 'Comments'
                            },
                            {
                                key: 'follow',
                                label: 'Follows'
                            }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filter === tab.key
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No notifications
                            </h3>
                            <p className="text-gray-500">
                                When people interact with your posts, you'll see it here.
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <Avatar
                                            src={notification.sender?.profile_picture}
                                            alt={notification.sender?.username}
                                            size="md"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                                            {getNotificationIcon(notification.notification_type)}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-900">
                                                    <span className="font-medium">{notification.sender?.username}</span>
                                                    {' '}
                                                    <span className="text-gray-600">
                                                        {getNotificationText(notification)}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTimeAgo(notification.created_at)}
                                                </p>
                                            </div>

                                            {notification.post && (
                                                <img
                                                    src={notification.post.image}
                                                    alt="Post"
                                                    className="w-12 h-12 object-cover rounded-lg ml-3"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {!notification.is_read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                </div>

                                {notification.notification_type === 'follow' && (
                                    <div className="mt-3 ml-14">
                                        <button className="btn-primary text-sm py-1 px-4">
                                            Follow Back
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default NotificationsPage
