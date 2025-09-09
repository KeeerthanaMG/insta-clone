import React, { useState, useEffect } from 'react'
import { Camera, Grid, Edit3, Settings, Lock, Bookmark } from 'lucide-react'
import { usersAPI, postsAPI } from '../lib/api'
import Avatar from '../components/Avatar'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const ProfilePage = () => {
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [privatePosts, setPrivatePosts] = useState([])
    const [savedPosts, setSavedPosts] = useState([])
    const [activeTab, setActiveTab] = useState('my-posts')
    const [loading, setLoading] = useState(true)
    const [editingBio, setEditingBio] = useState(false)
    const [bioText, setBioText] = useState('')

    const navigate = useNavigate()

    useEffect(() => {
        fetchProfile()
    }, [])

    useEffect(() => {
        // Fetch posts after profile is loaded
        if (profile?.username) {
            fetchAllPosts()
        }
    }, [profile])

    const fetchProfile = async () => {
        try {
            const response = await usersAPI.getProfile('me')
            setProfile(response.data)
            setBioText(response.data.bio || '')
        } catch (err) {
            console.error('Error fetching profile:', err)
        } finally {
            setLoading(false)
        }
    }

    // Add effect to listen for CTF bug discoveries and refresh profile
    useEffect(() => {
        const handleBugFound = () => {
            // Refresh profile data when a bug is found
            fetchProfile()
        }

        // Listen for CTF events
        window.addEventListener('ctf-bug-found', handleBugFound)

        return () => {
            window.removeEventListener('ctf-bug-found', handleBugFound)
        }
    }, [])

    const fetchAllPosts = async () => {
        try {
            // Fetch all three types of posts
            const [myPostsRes, privatePostsRes, savedPostsRes] = await Promise.all([
                usersAPI.getMyPosts(),
                usersAPI.getPrivatePosts(),
                usersAPI.getSavedPosts()
            ])

            setPosts(myPostsRes.data.results || [])
            setPrivatePosts(privatePostsRes.data.results || [])
            setSavedPosts(savedPostsRes.data.results || [])
        } catch (err) {
            console.error('Error fetching posts:', err)
            setPosts([])
            setPrivatePosts([])
            setSavedPosts([])
        }
    }

    const handleBioUpdate = async () => {
        try {
            await usersAPI.updateProfile({ bio: bioText })
            setProfile(prev => ({ ...prev, bio: bioText }))
            setEditingBio(false)
        } catch (err) {
            console.error('Error updating bio:', err)
        }
    }

    const handlePostClick = (postId) => {
        navigate(`/post/${postId}`)
    }
    const handleDeletePost = async (postId, tab) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await postsAPI.deletePost(postId)
            if (tab === 'my-posts') {
                setPosts(prev => prev.filter(post => post.id !== postId))
            } else if (tab === 'private-posts') {
                setPrivatePosts(prev => prev.filter(post => post.id !== postId))
            } else if (tab === 'saved-posts') {
                setSavedPosts(prev => prev.filter(post => (post.post?.id || post.id) !== postId))
            }
        } catch (err) {
            alert(err?.response?.data?.error || 'Failed to delete post')
        }
    }

    const renderTabContent = () => {
        let currentPosts = []
        let emptyMessage = ''
        let emptyIcon = <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />

        switch (activeTab) {
            case 'my-posts':
                currentPosts = posts
                emptyMessage = 'No public posts yet'
                emptyIcon = <Grid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                break
            case 'private-posts':
                currentPosts = privatePosts
                emptyMessage = 'No private posts yet'
                emptyIcon = <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                break
            case 'saved-posts':
                currentPosts = savedPosts
                emptyMessage = 'No saved posts yet'
                emptyIcon = <Bookmark className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                break
            default:
                currentPosts = posts
        }

        if (currentPosts.length === 0) {
            return (
                <div className="text-center py-12">
                    {emptyIcon}
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {emptyMessage}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {activeTab === 'my-posts' && 'Share your first photo to get started'}
                        {activeTab === 'private-posts' && 'Create a private post to keep it just for you'}
                        {activeTab === 'saved-posts' && 'Save posts you love to view them here'}
                    </p>
                    {activeTab !== 'saved-posts' && (
                        <button
                            onClick={() => window.location.href = '/create'}
                            className="btn-primary"
                        >
                            Create Post
                        </button>
                    )}
                </div>
            )
        }

        return (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {currentPosts.map((post, index) => {
                    // For saved posts, the actual post is post.post
                    const actualPost = activeTab === 'saved-posts' ? post.post || post : post
                    const isOwnSavedPost = activeTab === 'saved-posts' && actualPost?.owner?.username === profile?.username
                    return (
                        <motion.div
                            key={post.id}
                            className="aspect-square relative group cursor-pointer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handlePostClick(actualPost.id)}
                        >
                            <img
                                src={activeTab === 'saved-posts' ? actualPost.image : post.image}
                                alt="Post"
                                className="w-full h-full object-cover rounded-lg"
                            />
                            {/* Private post indicator */}
                            {activeTab === 'private-posts' && (
                                <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                                    <Lock className="h-3 w-3 text-white" />
                                </div>
                            )}
                            {/* Saved post indicator */}
                            {activeTab === 'saved-posts' && (
                                <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                                    <Bookmark className="h-3 w-3 text-white fill-white" />
                                </div>
                            )}
                            {/* Delete button for my-posts, private-posts, and own saved posts */}
                            {(activeTab === 'my-posts' || activeTab === 'private-posts' || isOwnSavedPost) && (
                                <button
                                    className="absolute top-2 left-2 bg-red-600 text-white rounded-full px-2 py-1 text-xs z-10"
                                    onClick={e => {
                                        e.stopPropagation()
                                        handleDeletePost(actualPost.id, activeTab)
                                    }}
                                >
                                    Delete
                                </button>
                            )}

                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 text-white text-center">
                                    <div className="flex items-center space-x-4">
                                        <span className="text-sm font-medium">
                                            ❤️ {activeTab === 'saved-posts' ? (actualPost.like_count || 0) : (post.like_count || 0)}
                                        </span>
                                        <span className="text-sm font-medium">
                                            💬 {activeTab === 'saved-posts' ? (actualPost.comment_count || 0) : (post.comment_count || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="flex items-center space-x-6 mb-8">
                        <div className="h-24 w-24 bg-gray-300 rounded-full"></div>
                        <div className="space-y-3">
                            <div className="h-6 bg-gray-300 rounded w-32"></div>
                            <div className="h-4 bg-gray-300 rounded w-48"></div>
                            <div className="h-4 bg-gray-300 rounded w-24"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">
                    Failed to load profile
                </h3>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Profile header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                <div className="flex items-start space-x-6">
                    <Avatar
                        src={profile.profile_picture}
                        alt={profile.username}
                        size="xl"
                    />

                    <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                            <button className="btn-secondary flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span>Edit Profile</span>
                            </button>
                        </div>

                        <div className="flex space-x-48 ml-16 mb-4">
                            <div className="text-center">
                                <div className="font-bold text-lg">{posts.length + privatePosts.length}</div>
                                <div className="text-gray-500 text-sm">Posts</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{profile.followers_count || 0}</div>
                                <div className="text-gray-500 text-sm">Followers</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{profile.following_count || 0}</div>
                                <div className="text-gray-500 text-sm">Following</div>
                            </div>
                        </div>

                        <div className="bio-section">
                            {editingBio ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={bioText}
                                        onChange={(e) => setBioText(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        rows={3}
                                        placeholder="Write something about yourself..."
                                        maxLength={150}
                                    />
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleBioUpdate}
                                            className="btn-primary text-sm py-1 px-3"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingBio(false)
                                                setBioText(profile.bio || '')
                                            }}
                                            className="btn-secondary text-sm py-1 px-3"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start space-x-2">
                                    <p className="text-red-700 flex-1">
                                        {profile.bio || 'No bio yet'}
                                    </p>
                                    <button
                                        onClick={() => setEditingBio(true)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts section with tabs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Tab navigation */}
                <div className="border-b pb-3 border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('my-posts')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'my-posts'
                                ? 'text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Grid className="h-4 w-4" />

                            <span>My Posts ({posts.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('private-posts')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'private-posts'
                                ? ' text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Lock className="h-4 w-4" />
                            <span>Private Posts ({privatePosts.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('saved-posts')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'saved-posts'
                                ? 'text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Bookmark className="h-4 w-4" />
                            <span>Saved Posts ({savedPosts.length})</span>
                        </button>
                    </nav>
                </div>

                {/* Tab content */}
                {renderTabContent()}
            </div>
        </div>
    )
}

export default ProfilePage

