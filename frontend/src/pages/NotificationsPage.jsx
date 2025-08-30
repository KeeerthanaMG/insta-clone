import React, { useState } from 'react'
import { Heart, MessageCircle, UserPlus, Camera } from 'lucide-react'
import Avatar from '../components/Avatar'
import { formatTimeAgo } from '../utils/timeAgo'

const NotificationsPage = () => {
    const [filter, setFilter] = useState('all')

    // Placeholder data
    const notifications = [
        {
            id: 1,
            type: 'like',
            user: { username: 'alice_johnson', profile_picture: null },
            post: { id: 1, image: 'https://picsum.photos/150/150?random=1' },
            timestamp: '2024-01-15T10:30:00Z',
            read: false
        },
        {
            id: 2,
            type: 'comment',
            user: { username: 'bob_miller', profile_picture: null },
            post: { id: 2, image: 'https://picsum.photos/150/150?random=2' },
            comment: 'Amazing shot! 📸',
            timestamp: '2024-01-15T09:15:00Z',
            read: false
        },
        {
            id: 3,
            type: 'follow',
            user: { username: 'sarah_davis', profile_picture: null },
            timestamp: '2024-01-14T16:45:00Z',
            read: true
        }
    ]

    const getNotificationIcon = (type) => {
        switch (type) {
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
        switch (notification.type) {
            case 'like':
                return 'liked your post'
            case 'comment':
                return `commented: "${notification.comment}"`
            case 'follow':
                return 'started following you'
            default:
                return 'interacted with your content'
        }
    }

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'all') return true
        if (filter === 'unread') return !notification.read
        return notification.type === filter
    })

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        <button className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                            Mark all as read
                        </button>
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
                                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <Avatar
                                            src={notification.user.profile_picture}
                                            alt={notification.user.username}
                                            size="md"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-900">
                                                    <span className="font-medium">{notification.user.username}</span>
                                                    {' '}
                                                    <span className="text-gray-600">
                                                        {getNotificationText(notification)}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTimeAgo(notification.timestamp)}
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

                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                </div>

                                {notification.type === 'follow' && (
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
