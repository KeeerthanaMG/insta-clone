import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Users, Sparkles, TrendingUp } from 'lucide-react'
import { usersAPI } from '../lib/api'
import Avatar from '../components/Avatar'
import { motion, AnimatePresence } from 'framer-motion'

const ExplorePage = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        // Remove automatic search on keystroke - only search when explicitly triggered
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

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            searchUsers()
        } else {
            setUsers([])
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch(e)
        }
    }

    const handleFollow = async (user) => {
        try {
            let response
            if (user.is_following) {
                response = await usersAPI.unfollowUser(user.id)
            } else {
                response = await usersAPI.followUser(user.id)
            }

            setUsers(prev => prev.map(u =>
                u.id === user.id
                    ? {
                        ...u,
                        is_following: response.data.is_following,
                        followers_count: response.data.followers_count
                    }
                    : u
            ))
        } catch (err) {
            console.error('Failed to follow/unfollow user:', err)
        }
    }

    const navigateToProfile = (username) => {
        navigate(`/profile/${username}`)
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
                className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl shadow-2xl border border-pink-200 p-8 mb-8 text-white"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Explore & Discover</h1>
                        <p className="text-pink-100">Find amazing people and connect with them</p>
                    </div>
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-white/70" />
                        <input
                            type="text"
                            placeholder="Search for users... (Press Enter to search)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full pl-14 pr-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/70 text-lg"
                        />
                    </div>
                </form>
            </motion.div>

            {error && (
                <motion.div
                    className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="font-medium">{error}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="animate-pulse text-center">
                                <div className="h-16 w-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-4"></div>
                                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full mb-2"></div>
                                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3 mx-auto mb-4"></div>
                                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl"></div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {!loading && users.length === 0 && searchQuery && (
                <motion.div
                    className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 text-center py-16"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        No users found
                    </h3>
                    <p className="text-gray-600 text-lg">
                        Try searching with different keywords
                    </p>
                </motion.div>
            )}

            {!loading && users.length === 0 && !searchQuery && (
                <motion.div
                    className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 text-center py-16"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="relative mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                            <Search className="h-12 w-12 text-pink-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        Discover new people
                    </h3>
                    <p className="text-gray-600 text-lg">
                        Search for users to connect with amazing creators
                    </p>
                </motion.div>
            )}

            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user, index) => (
                        <motion.div
                            key={user.id}
                            className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div
                                className="cursor-pointer"
                                onClick={() => navigateToProfile(user.username)}
                            >
                                <div className="relative mb-6">
                                    <Avatar
                                        src={user.profile_picture}
                                        alt={user.username}
                                        size="lg"
                                        className="mx-auto group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-white">
                                        <UserPlus className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 mb-2 hover:text-pink-600 transition-colors">
                                    {user.username}
                                </h3>
                                <p className="text-gray-500 text-base mb-2 font-medium">
                                    {user.followers_count} followers
                                </p>
                                <p className="text-gray-600 text-sm mb-6 line-clamp-2 leading-relaxed">
                                    {user.bio || 'No bio available'}
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleFollow(user)
                                }}
                                className={`w-full py-3 px-6 rounded-2xl font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${user.is_following
                                        ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-2xl'
                                    }`}
                            >
                                {user.is_following ? 'Following' : 'Follow'}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>
        </div>
    )
}

export default ExplorePage
