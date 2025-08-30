import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PostCard from '../components/PostCard'
import { postsAPI } from '../lib/api'
import { Camera } from 'lucide-react'

const FeedPage = () => {
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            setLoading(true)
            const response = await postsAPI.getPosts()
            setPosts(response.data.results || response.data || [])
        } catch (err) {
            setError('Failed to load posts')
            console.error('Error fetching posts:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePostUpdate = (postId, updates) => {
        setPosts(prev => prev.map(post =>
            post.id === postId ? { ...post, ...updates } : post
        ))
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="animate-pulse">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                                </div>
                            </div>
                            <div className="h-80 bg-gray-300 rounded-lg mb-4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-300 rounded w-full"></div>
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Something went wrong
                </h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                    onClick={fetchPosts}
                    className="btn-primary"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (posts.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No posts yet
                </h3>
                <p className="text-gray-500 mb-6">
                    Follow some users or create your first post to get started!
                </p>
                <button className="btn-primary">
                    Create Post
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {posts.map((post, index) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <PostCard
                            post={post}
                            onUpdated={handlePostUpdate}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </div>
    )
}

export default FeedPage
