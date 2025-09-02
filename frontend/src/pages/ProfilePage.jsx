import React, { useState, useEffect } from 'react'
import { Camera, Grid, Edit3, Settings } from 'lucide-react'
import { usersAPI } from '../lib/api'
import Avatar from '../components/Avatar'
import { motion } from 'framer-motion'

const ProfilePage = () => {
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingBio, setEditingBio] = useState(false)
    const [bioText, setBioText] = useState('')

    useEffect(() => {
        fetchProfile()
    }, [])

    useEffect(() => {
        // Fetch posts after profile is loaded
        if (profile?.username) {
            fetchUserPosts()
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

    const fetchUserPosts = async () => {
        try {
            // Get current user's posts
            if (profile?.username) {
                const response = await usersAPI.getUserPosts(profile.username)
                setPosts(response.data.results || [])
            }
        } catch (err) {
            console.error('Error fetching posts:', err)
            setPosts([])
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

                        <div className="flex space-x-8 mb-4">
                            <div className="text-center">
                                <div className="font-bold text-lg">{posts.length}</div>
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
                            <div className="text-center">
                                <div className="font-bold text-lg text-green-600">{profile.points || 0}</div>
                                <div className="text-gray-500 text-sm">CTF Points</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg text-purple-600">{profile.bugs_solved || 0}</div>
                                <div className="text-gray-500 text-sm">Bugs Found</div>
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
                                    <p className="text-gray-700 flex-1">
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

            {/* Posts grid */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                    <Grid className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Your Posts</h2>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-12">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No posts yet
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Share your first photo to get started
                        </p>
                        <button
                            onClick={() => window.location.href = '/create'}
                            className="btn-primary"
                        >
                            Create Your First Post
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {posts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                className="aspect-square relative group cursor-pointer"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <img
                                    src={post.image}
                                    alt="Post"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 text-white text-center">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-sm font-medium">
                                                ❤️ {post.like_count || 0}
                                            </span>
                                            <span className="text-sm font-medium">
                                                💬 {post.comment_count || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProfilePage

