import React, { useState, useEffect } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { usersAPI } from '../lib/api'
import Avatar from '../components/Avatar'

const ExplorePage = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (searchQuery.trim()) {
            searchUsers()
        } else {
            setUsers([])
        }
    }, [searchQuery])

    const searchUsers = async () => {
        try {
            setLoading(true)
            const response = await usersAPI.searchUsers(searchQuery)
            setUsers(response.data.results || response.data)
        } catch (err) {
            setError('Failed to search users')
        } finally {
            setLoading(false)
        }
    }

    const handleFollow = async (userId) => {
        try {
            await usersAPI.followUser(userId)
            setUsers(prev => prev.map(user =>
                user.id === userId
                    ? { ...user, is_following: !user.is_following }
                    : user
            ))
        } catch (err) {
            console.error('Failed to follow user:', err)
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Explore</h1>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
                            <div className="animate-pulse">
                                <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
                                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded w-2/3 mx-auto mb-4"></div>
                                <div className="h-8 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && users.length === 0 && searchQuery && (
                <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        No users found
                    </h3>
                    <p className="text-gray-500">
                        Try searching with different keywords
                    </p>
                </div>
            )}

            {!loading && users.length === 0 && !searchQuery && (
                <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Discover new people
                    </h3>
                    <p className="text-gray-500">
                        Search for users to connect with
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                    <div key={user.id} className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                        <Avatar
                            src={user.profile_picture}
                            alt={user.username}
                            size="lg"
                            className="mx-auto mb-4"
                        />
                        <h3 className="font-semibold text-gray-900 mb-1">{user.username}</h3>
                        <p className="text-gray-500 text-sm mb-4">{user.bio || 'No bio available'}</p>
                        <button
                            onClick={() => handleFollow(user.id)}
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${user.is_following
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'btn-primary'
                                }`}
                        >
                            {user.is_following ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ExplorePage
