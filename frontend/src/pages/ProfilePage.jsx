import React, { useState, useEffect } from 'react'
import { Camera, Grid, Settings } from 'lucide-react'
import { usersAPI, postsAPI } from '../lib/api'
import Avatar from '../components/Avatar'

const ProfilePage = () => {
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [editData, setEditData] = useState({ bio: '' })

    useEffect(() => {
        fetchProfile()
        fetchUserPosts()
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await usersAPI.getProfile()
            setProfile(response.data)
            setEditData({ bio: response.data.bio || '' })
        } catch (err) {
            console.error('Error fetching profile:', err)
            // Set dummy data if API fails
            setProfile({
                username: 'demo_user',
                bio: 'Welcome to InstaCam!',
                profile_picture: null,
                followers_count: 0,
                following_count: 0
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchUserPosts = async () => {
        try {
            const response = await postsAPI.getPosts()
            setPosts(response.data.results || response.data || [])
        } catch (err) {
            console.error('Error fetching posts:', err)
            setPosts([])
        }
    }

    const handleUpdateProfile = async () => {
        try {
            await usersAPI.updateProfile(editData)
            setProfile(prev => ({ ...prev, ...editData }))
            setEditing(false)
        } catch (err) {
            console.error('Error updating profile:', err)
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

    return (
        <div className="max-w-4xl mx-auto">
            {/* Profile header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                <div className="flex items-start space-x-6">
                    <Avatar
                        src={profile?.profile_picture}
                        alt={profile?.username || 'User'}
                        size="xl"
                    />

                    <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{profile?.username || 'User'}</h1>
                            <button
                                onClick={() => setEditing(!editing)}
                                className="btn-secondary flex items-center space-x-2"
                            >
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
                                <div className="font-bold text-lg">{profile?.followers_count || 0}</div>
                                <div className="text-gray-500 text-sm">Followers</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{profile?.following_count || 0}</div>
                                <div className="text-gray-500 text-sm">Following</div>
                            </div>
                        </div>

                        {editing ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editData.bio}
                                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                    placeholder="Write a bio..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    rows={3}
                                />
                                <div className="flex space-x-2">
                                    <button onClick={handleUpdateProfile} className="btn-primary text-sm">
                                        Save
                                    </button>
                                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-700">{profile?.bio || 'No bio yet'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Posts grid */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                    <Grid className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Posts</h2>
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
                        <button className="btn-primary">
                            Create Post
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {posts.map((post) => (
                            <div key={post.id} className="aspect-square relative group cursor-pointer">
                                <img
                                    src={post.image}
                                    alt="Post"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 text-white text-center">
                                        <div className="flex items-center space-x-4">
                                            <span className="text-sm font-medium">{post.like_count || 0}</span>
                                            <span className="text-sm font-medium">{post.comment_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProfilePage

