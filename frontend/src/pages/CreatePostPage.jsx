import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { postsAPI } from '../lib/api'

const CreatePostPage = () => {
    const [selectedImage, setSelectedImage] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const [caption, setCaption] = useState('')
    const [isPrivate, setIsPrivate] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onload = () => setImagePreview(reader.result)
            reader.readAsDataURL(file)
            setError('')
        }
    }

    const removeImage = () => {
        setSelectedImage(null)
        setImagePreview('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!selectedImage) {
            setError('Please select an image')
            return
        }

        setLoading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('image', selectedImage)
            formData.append('caption', caption)
            formData.append('is_private', isPrivate)

            await postsAPI.createPost(formData)
            navigate('/feed')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Create New Post
                </h1>
                <p className="text-gray-600">Share your moment with the world</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl backdrop-blur-sm">
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
                    </div>
                )}

                {/* Image upload */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-lg">
                    {!imagePreview ? (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-pink-400 hover:bg-pink-50/30 transition-all duration-300 group">
                                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="h-8 w-8 text-pink-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">
                                    Upload your photo
                                </h3>
                                <p className="text-gray-500 text-lg">
                                    Drag and drop or click to select
                                </p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Supports JPG, PNG, GIF up to 10MB
                                </p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="relative">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full max-h-96 object-cover rounded-2xl shadow-lg"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all duration-200 hover:scale-110"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                                <div className="flex items-center space-x-2">
                                    <ImageIcon className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Ready to share</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Caption */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-lg">
                    <label htmlFor="caption" className="block text-lg font-bold text-gray-900 mb-4">
                        Write a caption
                    </label>
                    <textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="What's on your mind?"
                        rows={4}
                        className="w-full px-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none bg-gray-50/50 backdrop-blur-sm transition-all duration-200 text-gray-900 placeholder-gray-500"
                        maxLength={2200}
                    />
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Share your story, add hashtags, mention friends
                        </span>
                        <span className={`text-sm font-medium ${caption.length > 2000 ? 'text-red-500' : 'text-gray-500'}`}>
                            {caption.length}/2200
                        </span>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy Settings</h3>
                    <label className="flex items-center space-x-4 p-4 bg-gray-50/50 rounded-2xl cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="w-5 h-5 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                        />
                        <div className="flex-1">
                            <span className="text-base font-semibold text-gray-900">Make this post private</span>
                            <p className="text-sm text-gray-500 mt-1">Only you will be able to see this post</p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-full">
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </label>
                </div>

                {/* Submit buttons */}
                <div className="flex space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/feed')}
                        className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedImage}
                        className="flex-1 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none transition-all duration-200"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Sharing...</span>
                            </div>
                        ) : (
                            'Share Post'
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CreatePostPage
