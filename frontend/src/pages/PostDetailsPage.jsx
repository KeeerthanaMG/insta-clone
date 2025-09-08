import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { postsAPI } from '../lib/api'
import PostCard from '../components/PostCard'
import { motion } from 'framer-motion'

const PostDetailsPage = () => {
    const { postId } = useParams()
    const navigate = useNavigate()
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (postId) {
            fetchPost()
        }
    }, [postId])

    const fetchPost = async () => {
        try {
            setLoading(true)
            const response = await postsAPI.getPost(postId)
            setPost(response.data)
        } catch (err) {
            console.error('Error fetching post:', err)
            setError('Post not found or you do not have permission to view it')
        } finally {
            setLoading(false)
        }
    }

    const handlePostUpdate = (updatedPostId, updates) => {
        if (updatedPostId === post?.id) {
            setPost(prev => ({ ...prev, ...updates }))
        }
    }

    const handleBack = () => {
        // Check if we came from a specific route
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate('/feed')
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center space-x-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back</span>
                    </button>
                </div>

                <motion.div 
                    className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center space-x-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back</span>
                    </button>
                </div>

                <motion.div 
                    className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 text-center py-16"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Camera className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        Post not found
                    </h3>
                    <p className="text-gray-600 mb-8 text-lg">
                        {error || 'This post may have been deleted or you do not have permission to view it.'}
                    </p>
                    <button
                        onClick={handleBack}
                        className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                    >
                        Go Back
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back button */}
            <div className="flex items-center space-x-4 mb-6">
                <button
                    onClick={handleBack}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Back</span>
                </button>
                <div className="text-gray-400">•</div>
                <h1 className="text-xl font-semibold text-gray-800">Post Details</h1>
            </div>

            {/* Post */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <PostCard 
                    post={post} 
                    onUpdated={handlePostUpdate}
                />
            </motion.div>
        </div>
    )
}

export default PostDetailsPage
