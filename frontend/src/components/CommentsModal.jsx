import React, { useState, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { commentsAPI } from '../lib/api'
import Avatar from './Avatar'
import { formatTimeAgo } from '../utils/timeAgo'

const CommentsModal = ({ post, isOpen, onClose }) => {
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen && post) {
            fetchComments()
        }
    }, [isOpen, post])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    const fetchComments = async () => {
        try {
            setLoading(true)
            const response = await commentsAPI.getComments(post.id)
            setComments(response.data.results || [])
        } catch (error) {
            console.error('Error fetching comments:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim()) return

        try {
            setSubmitting(true)
            const response = await commentsAPI.createComment({
                post: post.id,
                text: newComment.trim()
            })

            setComments(prev => [response.data, ...prev])
            setNewComment('')
        } catch (error) {
            console.error('Error creating comment:', error)
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
                    {/* <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button> */}
                </div>

                {/* Post Preview */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start space-x-3">
                        <Avatar
                            src={post.user.profile_picture}
                            alt={post.user.username}
                            size="sm"
                        />
                        <div className="flex-1">
                            <p className="text-sm">
                                <span className="font-semibold">{post.user.username}</span>
                                {post.caption && (
                                    <span className="ml-2 text-gray-700">{post.caption}</span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(post.created_at)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex space-x-3 animate-pulse">
                                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                                <Avatar
                                    src={comment.user?.profile_picture}
                                    alt={comment.user?.username || 'Unknown User'}
                                    size="sm"
                                />
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold">{comment.user?.username || 'Unknown User'}</span>
                                        <span className="ml-2 text-gray-700">{comment.text}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatTimeAgo(comment.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No comments yet</p>
                            <p className="text-sm text-gray-400">Be the first to comment!</p>
                        </div>
                    )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500"
                            disabled={submitting}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CommentsModal
