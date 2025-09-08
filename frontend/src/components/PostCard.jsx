/**
 * PostCard Component
 * 
 * Features:
 * - Normal post interactions (like, save, comment)
 * - CTF Race Condition Bug: If user clicks save button 10+ times rapidly,
 *   triggers a race condition vulnerability detection in the backend
 * - Bug found popup appears (no automatic redirection)
 * - Points are awarded only once per user per bug
 */

import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, Search } from 'lucide-react'
import { postsAPI, usersAPI, messagesAPI } from '../lib/api'
import Avatar from './Avatar'
import CommentsModal from './CommentsModal'
import { formatTimeAgo } from '../utils/timeAgo'

const ShareModal = ({ isOpen, onClose, post }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const navigate = useNavigate()

    const searchUsers = useCallback(async (query) => {
        if (!query.trim()) {
            setUsers([])
            return
        }
        try {
            setLoading(true)
            const response = await usersAPI.searchUsers(query)
            setUsers(response.data.results || response.data)
        } catch (error) {
            console.error('Error searching users:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSearch = useCallback((e) => {
        const query = e.target.value
        setSearchQuery(query)
        searchUsers(query)
    }, [searchUsers])

    const handleShare = useCallback(async (user) => {
        try {
            setSending(true)

            // Create or get the thread
            const threadResponse = await messagesAPI.startThread(user.id)
            const threadId = threadResponse.data.id

            // Format the shared post message
            const shareMessage = `🔗 Shared a post from @${post.user.username}\n\n"${post.caption || 'No caption'}"\n\n💖 ${post.like_count || 0} likes • 💬 ${post.comment_count || 0} comments`

            // Send the message
            await messagesAPI.sendMessage(threadId, shareMessage)

            // Dispatch event to notify MessagesPage to refresh
            window.dispatchEvent(new CustomEvent('shared-post-message', {
                detail: { threadId }
            }))

            // Close modal
            onClose()
            
            // Navigate to the conversation with a small delay
            setTimeout(() => {
                navigate(`/messages/${threadId}`)
            }, 100)

        } catch (error) {
            console.error('Error sharing post:', error)
            // You could add error handling UI here
        } finally {
            setSending(false)
        }
    }, [post, onClose, navigate])

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }, [onClose])

    if (!isOpen) return null

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                onClick={handleBackdropClick}
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Share post</h3>
                            <button
                                onClick={onClose}
                                disabled={sending}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                aria-label="Close modal"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Show post preview */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3 mb-2">
                                <Avatar src={post.user.profile_picture} alt={post.user.username} size="sm" />
                                <div>
                                    <p className="font-medium text-gray-900">@{post.user.username}</p>
                                    <p className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <img 
                                    src={post.image} 
                                    alt="Post preview" 
                                    className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {post.caption || 'No caption'}
                                    </p>
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                        <span>💖 {post.like_count || 0}</span>
                                        <span>💬 {post.comment_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search people..."
                                value={searchQuery}
                                onChange={handleSearch}
                                disabled={sending}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all disabled:opacity-50"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {loading && (
                            <div className="p-6 text-center text-gray-500">
                                Searching...
                            </div>
                        )}
                        {!loading && users.length === 0 && searchQuery && (
                            <div className="p-6 text-center text-gray-500">
                                No users found
                            </div>
                        )}
                        {!loading && !searchQuery && (
                            <div className="p-6 text-center text-gray-500">
                                Search for people to share with
                            </div>
                        )}
                        {!loading && users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <Avatar src={user.profile_picture} alt={user.username} size="sm" />
                                    <div>
                                        <p className="font-semibold text-gray-900">{user.username}</p>
                                        <p className="text-sm text-gray-500">{user.followers_count} followers</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleShare(user)}
                                    disabled={sending}
                                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex items-center space-x-2"
                                >
                                    {sending ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            <span>Send</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )

    // Use portal to render modal outside component tree
    return createPortal(modalContent, document.body)
}

const CommentsModalPortal = ({ isOpen, onClose, post, onUpdate }) => {
    if (!isOpen) return null

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose()
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onClose()
                    }
                }}
                role="dialog"
                aria-modal="true"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full max-w-4xl max-h-[80vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <CommentsModal
                        post={post}
                        isOpen={true}
                        onClose={onClose}
                        onUpdate={onUpdate}
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}

const PostCard = ({ post, onUpdated }) => {
    const [isLiked, setIsLiked] = useState(post.is_liked)
    const [likeCount, setLikeCount] = useState(post.like_count)
    const [isSaved, setIsSaved] = useState(post.is_saved)
    const [commentCount, setCommentCount] = useState(post.comment_count || 0)
    const [showComments, setShowComments] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    
    // Track save clicks for race condition detection
    const [saveClickCount, setSaveClickCount] = useState(0)
    const [saveClickTimes, setSaveClickTimes] = useState([])

    const handleLike = async () => {
        try {
            const response = await postsAPI.likePost(post.id)
            setIsLiked(response.data.liked)
            setLikeCount(response.data.likes)
            onUpdated?.(post.id, { is_liked: response.data.liked, like_count: response.data.likes })
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleSave = async () => {
        try {
            // Track clicks for race condition detection
            const currentTime = Date.now()
            setSaveClickTimes(prev => {
                const newTimes = [...prev, currentTime]
                // Keep only clicks from the last 10 seconds
                const filteredTimes = newTimes.filter(time => currentTime - time < 10000)
                
                // If user clicked 10+ times rapidly, they'll trigger the backend race condition
                if (filteredTimes.length >= 10) {
                    console.log('🚨 Race condition detected! You clicked the save button rapidly 10+ times!')
                }
                
                return filteredTimes
            })
            
            setSaveClickCount(prev => prev + 1)
            
            const response = await postsAPI.savePost(post.id)
            
            // Check if this was a CTF response
            if (response.data.vulnerability_detected) {
                // CTF bug found - the API interceptor will handle the popup
                // No automatic redirection - let user stay on current page
                return
            }
            
            // Normal save/unsave behavior
            setIsSaved(response.data.saved)
            onUpdated?.(post.id, { is_saved: response.data.saved })
        } catch (error) {
            console.error('Error toggling save:', error)
        }
    }

    const handleCommentsUpdate = () => {
        // Refresh comment count when comments modal is closed
        setCommentCount(prev => prev + 1)
        onUpdated?.(post.id, { comment_count: commentCount + 1 })
    }

    const handleShareModalToggle = useCallback(() => {
        setShowShareModal(prev => !prev)
    }, [])

    const handleShareModalClose = useCallback(() => {
        setShowShareModal(false)
    }, [])

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-hidden backdrop-blur-sm bg-opacity-95"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Avatar
                                src={post.user.profile_picture}
                                alt={post.user.username}
                                size="md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{post.user.username}</h3>
                            <p className="text-sm text-gray-500 font-medium">{formatTimeAgo(post.created_at)}</p>
                        </div>
                    </div>
                    <button className="p-3 hover:bg-gray-50 rounded-full transition-all duration-200 hover:shadow-md">
                        <MoreHorizontal className="h-6 w-6 text-gray-600" />
                    </button>
                </div>

                {/* Image */}
                <motion.div
                    className="relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <img
                        src={post.image}
                        alt="Post content"
                        className="w-full max-h-[600px] object-cover"
                        onDoubleClick={handleLike}
                    />
                    
                </motion.div>

                {/* Actions */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={handleLike}
                                className="focus:outline-none p-1 rounded-full hover:bg-pink-50 transition-all duration-200"
                            >
                                <Heart
                                    className={`h-8 w-8 transition-all duration-300 ${isLiked
                                        ? 'fill-red-500 text-red-500 scale-110'
                                        : 'text-gray-700 hover:text-red-500 hover:scale-110'
                                        }`}
                                />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => setShowComments(true)}
                                className="focus:outline-none p-1 rounded-full hover:bg-blue-50 transition-all duration-200"
                            >
                                <MessageCircle className="h-8 w-8 text-gray-700 hover:text-blue-500 hover:scale-110 transition-all duration-200" />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={handleShareModalToggle}
                                className="focus:outline-none p-1 rounded-full hover:bg-green-50 transition-all duration-200"
                            >
                                <Send className="h-8 w-8 text-gray-700 hover:text-green-500 hover:scale-110 transition-all duration-200" />
                            </motion.button>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={handleSave}
                            className="focus:outline-none p-1 rounded-full hover:bg-yellow-50 transition-all duration-200"
                        >
                            <Bookmark
                                className={`h-8 w-8 transition-all duration-300 ${isSaved
                                    ? 'fill-yellow-500 text-yellow-500 scale-110'
                                    : 'text-gray-700 hover:text-yellow-500 hover:scale-110'
                                    }`}
                            />
                        </motion.button>
                    </div>

                    {/* Like count */}
                    {likeCount > 0 && (
                        <div className="font-bold text-gray-900 text-lg">
                            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
                        </div>
                    )}

                    {/* Caption */}
                    {post.caption && (
                        <div className="text-gray-900 leading-relaxed">
                            <span className="font-bold mr-2 text-lg">{post.user.username}</span>
                            <span className="text-base">{post.caption}</span>
                        </div>
                    )}

                    {/* Comments link */}
                    {commentCount > 0 && (
                        <button
                            onClick={() => setShowComments(true)}
                            className="text-gray-500 hover:text-gray-700 text-base font-medium transition-colors"
                        >
                            View all {commentCount} comments
                        </button>
                    )}
                </div>
            </motion.div>

            <CommentsModalPortal
                post={post}
                isOpen={showComments}
                onClose={() => setShowComments(false)}
                onUpdate={handleCommentsUpdate}
            />

            <ShareModal
                isOpen={showShareModal}
                onClose={handleShareModalClose}
                post={post}
            />
        </>
    )
}

export default PostCard

