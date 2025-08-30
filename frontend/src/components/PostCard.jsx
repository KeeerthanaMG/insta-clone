import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { postsAPI } from '../lib/api'
import Avatar from './Avatar'
import { formatTimeAgo } from '../utils/timeAgo'

const PostCard = ({ post, onUpdated }) => {
    const [isLiked, setIsLiked] = useState(post.is_liked)
    const [likeCount, setLikeCount] = useState(post.like_count)
    const [isSaved, setIsSaved] = useState(post.is_saved)
    const [comment, setComment] = useState('')

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
            const response = await postsAPI.savePost(post.id)
            setIsSaved(response.data.saved)
            onUpdated?.(post.id, { is_saved: response.data.saved })
        } catch (error) {
            console.error('Error toggling save:', error)
        }
    }

    const handleCommentSubmit = (e) => {
        e.preventDefault()
        if (!comment.trim()) return

        // TODO: Implement comment submission
        console.log('Submitting comment:', comment)
        setComment('')
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                    <Avatar
                        src={post.user.profile_picture}
                        alt={post.user.username}
                        size="md"
                    />
                    <div>
                        <h3 className="font-semibold text-gray-900">{post.user.username}</h3>
                        <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MoreHorizontal className="h-5 w-5 text-gray-500" />
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
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={handleLike}
                            className="focus:outline-none"
                        >
                            <Heart
                                className={`h-7 w-7 transition-all duration-200 ${isLiked
                                        ? 'fill-red-500 text-red-500 animate-pop'
                                        : 'text-gray-700 hover:text-red-500'
                                    }`}
                            />
                        </motion.button>

                        <button className="focus:outline-none hover:text-gray-600">
                            <MessageCircle className="h-7 w-7 text-gray-700" />
                        </button>

                        <button className="focus:outline-none hover:text-gray-600">
                            <Send className="h-7 w-7 text-gray-700" />
                        </button>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={handleSave}
                        className="focus:outline-none"
                    >
                        <Bookmark
                            className={`h-7 w-7 transition-all duration-200 ${isSaved
                                    ? 'fill-gray-900 text-gray-900'
                                    : 'text-gray-700 hover:text-gray-900'
                                }`}
                        />
                    </motion.button>
                </div>

                {/* Like count */}
                {likeCount > 0 && (
                    <div className="font-bold text-gray-900">
                        {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
                    </div>
                )}

                {/* Caption */}
                {post.caption && (
                    <div className="text-gray-900">
                        <span className="font-semibold mr-2">{post.user.username}</span>
                        <span>{post.caption}</span>
                    </div>
                )}

                {/* Comments link */}
                {post.comment_count > 0 && (
                    <button className="text-gray-500 hover:text-gray-700 text-sm">
                        View all {post.comment_count} comments
                    </button>
                )}

                {/* Comment input */}
                <form onSubmit={handleCommentSubmit} className="border-t pt-3">
                    <div className="flex items-center space-x-3">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="flex-1 bg-transparent placeholder-gray-500 focus:outline-none"
                        />
                        {comment.trim() && (
                            <button
                                type="submit"
                                className="text-blue-500 font-semibold hover:text-blue-600"
                            >
                                Post
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </motion.div>
    )
}

export default PostCard
