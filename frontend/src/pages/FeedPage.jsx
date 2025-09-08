import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { feedAPI, usersAPI } from '../lib/api'
import { Camera, Users, UserPlus, Sparkles, TrendingUp, Heart, Bug, Trophy } from 'lucide-react'
import Avatar from '../components/Avatar'

const ChallengeWelcomeBox = () => (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 mb-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-pink-200/30 to-transparent rounded-full -mr-12 -mt-12"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full -ml-10 -mb-10"></div>
        
        {/* Header */}
        <div className="flex items-start space-x-4 mb-6 relative z-10">
            <div className="relative transform-gpu transition-all duration-300 group-hover:scale-110 perspective-1000" style={{ width: 48, height: 48 }}>
                {/* 3D Shadow layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600 rounded-xl transform translate-x-0.5 translate-y-0.5 opacity-50"></div>
                {/* Main logo */}
                <div className="relative px-2 py-3 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48 }}>
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-xl"></div>
                    {/* Camera icon/image */}
                    <div className="relative z-10">
                        <Camera className='text-white' w-6 h-6 />
                    </div>
                    {/* Animated shine effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
             </div>
            <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-1 leading-tight">
                    Welcome to Day 2
                </h2>
                <h3 className="text-lg font-semibold text-pink-600 mb-2">
                    Bug Bounty Challenge
                </h3>
                <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full shadow-sm">
                        PYCON'25
                    </span>
                    <span className="text-sm text-gray-600 font-medium">HappyFox</span>
                </div>
            </div>
        </div>

        {/* Description */}
        <div className="mb-6 relative z-10">
            <p className="text-gray-700 text-sm leading-relaxed">
                Hunt for vulnerabilities in InstaCam, earn points, and climb the leaderboard! 🏆
            </p>
        </div>

        {/* Rules */}
        <div className="mb-6 relative z-10">
            <h4 className="text-sm font-bold text-pink-700 mb-3 flex items-center">
                <Bug className="h-4 w-4 mr-2" />
                Challenge Rules
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>All vulnerabilities are intentional for education</span>
                </li>
                <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Points awarded automatically when bugs are found</span>
                </li>
                <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Check your profile to track progress</span>
                </li>
                <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>No attacks on infrastructure or participants</span>
                </li>
                <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Have fun, learn, and share findings!</span>
                </li>
            </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-pink-200/50 relative z-10">
            <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold text-purple-700">Happy Hunting!</span>
            </div>
            <div className="flex items-center space-x-1">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-gray-500">Day 2</span>
            </div>
        </div>
    </div>
)

const SuggestedUsersBox = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [followLoading, setFollowLoading] = useState({})

    useEffect(() => {
        fetchAllUsers()
    }, [])

    const fetchAllUsers = async () => {
        try {
            setLoading(true)
            const response = await usersAPI.getAllUsers()
            setUsers(response.data.results || response.data)
        } catch (err) {
            setError('Failed to load suggestions')
        } finally {
            setLoading(false)
        }
    }

    const handleFollow = async (user) => {
        setFollowLoading(prev => ({ ...prev, [user.id]: true }))
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
            setError('Failed to follow/unfollow user')
        } finally {
            setFollowLoading(prev => ({ ...prev, [user.id]: false }))
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="font-bold text-lg text-gray-900 mb-4">Suggested Users</div>
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 animate-pulse">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="font-bold text-lg text-gray-900 mb-4">Suggested Users</div>
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="font-bold text-lg text-gray-900 mb-4">Suggested Users</div>
            <div className="space-y-4">
                {users.slice(0, 6).map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Avatar src={user.profile_picture} alt={user.username} size="sm" />
                            <div>
                                <div className="font-semibold text-gray-900">{user.username}</div>
                                <div className="text-xs text-gray-500">{user.followers_count} followers</div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleFollow(user)}
                            disabled={followLoading[user.id]}
                            className={`px-4 py-1 rounded-full text-sm font-semibold transition-all duration-200 ${
                                user.is_following
                                    ? 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg'
                            }`}
                        >
                            {followLoading[user.id]
                                ? '...'
                                : user.is_following ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

const FeedPage = () => {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        fetchFeed()
    }, [])

    const fetchFeed = async () => {
        try {
            setLoading(true)
            const response = await feedAPI.getFeed()
            setPosts(response.data.results || [])
        } catch (err) {
            setError('Failed to load feed')
            console.error('Error fetching feed:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePostUpdate = (postId, updates) => {
        setPosts(prev => prev.map(post =>
            post.id === postId ? { ...post, ...updates } : post
        ))
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 max-w-2xl">
                {/* Feed Title & Subtitle */}
                <div className="text-left mb-6">
                    <h1 className="text-3xl font-semibold text-gray-900">Feed</h1>
                    <p className="text-gray-500 text-lg mt-2">Here's what's happening with your friends</p>
                </div>

                {/* Feed content */}
                {loading && (
                    <div className="space-y-8">
                        {/* Header skeleton */}
                        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 p-8">
                            <div className="flex items-center space-x-4 animate-pulse">
                                <div className="h-16 w-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4"></div>
                                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/2"></div>
                                </div>
                            </div>
                        </div>

                        {/* Post skeletons */}
                        {[...Array(3)].map((_, i) => (
                            <motion.div 
                                key={i} 
                                className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 p-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="animate-pulse">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="h-12 w-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/3"></div>
                                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/4"></div>
                                        </div>
                                    </div>
                                    <div className="h-80 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mb-4"></div>
                                    <div className="space-y-3">
                                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-full"></div>
                                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4"></div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {error && (
                    <motion.div 
                        className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 text-center py-16"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Camera className="h-10 w-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">
                            Oops! Something went wrong
                        </h3>
                        <p className="text-gray-600 mb-8 text-lg">{error}</p>
                        <button
                            onClick={fetchFeed}
                            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                        >
                            Try Again
                        </button>
                    </motion.div>
                )}

                {!loading && !error && posts.length === 0 && (
                    <motion.div 
                        className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 text-center py-16"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="relative mb-8">
                            <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                                <Users className="h-12 w-12 text-pink-500" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">
                            Your feed is looking empty
                        </h3>
                        <p className="text-gray-600 mb-8 text-lg">
                            Follow some amazing creators to see their posts here!
                        </p>
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/explore')}
                                className="flex items-center space-x-3 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 mx-auto"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span>Discover People</span>
                            </button>
                            <button
                                onClick={() => navigate('/create')}
                                className="flex items-center space-x-3 px-8 py-3 bg-white text-gray-700 rounded-2xl font-semibold border border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 mx-auto"
                            >
                                <Camera className="h-5 w-5" />
                                <span>Create Your First Post</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {!loading && !error && posts.length > 0 && (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8"
                        >
                            {posts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        delay: index * 0.1,
                                        type: "spring",
                                        stiffness: 100,
                                        damping: 15
                                    }}
                                    whileHover={{ 
                                        y: -5,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    <PostCard
                                        post={post}
                                        onUpdated={handlePostUpdate}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Load more button */}
                {!loading && !error && posts.length > 0 && (
                    <motion.div 
                        className="text-center mt-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: posts.length * 0.1 + 0.5 }}
                    >
                        <button
                            onClick={fetchFeed}
                            className="flex items-center space-x-3 px-8 py-3 bg-white text-gray-700 rounded-2xl font-semibold border border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 mx-auto"
                        >
                            <Heart className="h-5 w-5 text-pink-500" />
                            <span>Load more posts</span>
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Right sidebar with challenge welcome and suggested users */}
            <div className="w-full md:w-80 md:block hidden">
                <ChallengeWelcomeBox />
                <SuggestedUsersBox />
            </div>
        </div>
    )
}

export default FeedPage
