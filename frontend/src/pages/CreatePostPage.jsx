import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X } from 'lucide-react'
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
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Post</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Image upload */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {!imagePreview ? (
                        <label className="block">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-pink-400 transition-colors cursor-pointer">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Upload your photo
                                </h3>
                                <p className="text-gray-500">
                                    Drag and drop or click to select
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
                                className="w-full max-h-96 object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Caption */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                        Caption
                    </label>
                    <textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        maxLength={2200}
                    />
                    <div className="mt-2 text-sm text-gray-500 text-right">
                        {caption.length}/2200
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900">Make this post private</span>
                            <p className="text-xs text-gray-500">Only you will be able to see this post</p>
                        </div>
                    </label>
                </div>

                {/* Submit button */}
                <div className="flex space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/feed')}
                        className="flex-1 btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedImage}
                        className="flex-1 btn-primary disabled:opacity-50"
                    >
                        {loading ? 'Posting...' : 'Share Post'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CreatePostPage
