import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, Grid, ArrowLeft, UserPlus } from 'lucide-react'
import { usersAPI, postsAPI } from '../lib/api'
import Avatar from '../components/Avatar'

const UserProfilePage = () => {
    const { username } = useParams()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [following, setFollowing] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)

    useEffect(() => {
        if (username) {
            fetchProfile()
            fetchUserPosts()
        }
    }, [username])

    const fetchProfile = async () => {
        try {
            const response = await usersAPI.getProfile(username)
            setProfile(response.data)
            setFollowing(response.data.is_following || false)
            setFollowersCount(response.data.followers_count || 0)
        } catch (err) {
            console.error('Error fetching profile:', err)
            navigate('/explore')
        } finally {
            setLoading(false)
        }
    }

    const fetchUserPosts = async () => {
        try {
            if (username) {
                const response = await usersAPI.getUserPosts(username)
                setPosts(response.data.results || [])
            }
        } catch (err) {
            console.error('Error fetching posts:', err)
            setPosts([])
        }
    }

    const handleFollow = async () => {
        try {
            let response
            if (following) {
                response = await usersAPI.unfollowUser(profile.id)
            } else {
                response = await usersAPI.followUser(profile.id)
            }

            setFollowing(response.data.is_following)
            setFollowersCount(response.data.followers_count)
        } catch (err) {
            console.error('Error following/unfollowing user:', err)
        }
    }

    const handlePostClick = (postId) => {
        navigate(`/post/${postId}`)
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
                    User not found
                </h3>
                <button
                    onClick={() => navigate('/explore')}
                    className="btn-primary mt-4"
                >
                    Back to Explore
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <button
                onClick={() => navigate('/explore')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Explore</span>
            </button>

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
                            <button
                                onClick={handleFollow}
                                className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-colors ${following
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'btn-primary'
                                    }`}
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>{following ? 'Following' : 'Follow'}</span>
                            </button>
                        </div>

                        <div className="flex space-x-8 mb-4">
                            <div className="text-center">
                                <div className="font-bold text-lg">{posts.length}</div>
                                <div className="text-gray-500 text-sm">Posts</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{followersCount}</div>
                                <div className="text-gray-500 text-sm">Followers</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{profile.following_count || 0}</div>
                                <div className="text-gray-500 text-sm">Following</div>
                            </div>
                        </div>

                        <p className="text-gray-700">{profile.bio || 'No bio available'}</p>
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
                        <p className="text-gray-500">
                            {profile.username} hasn't shared any posts yet
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        {posts.map((post) => (
                            <div 
                                key={post.id} 
                                className="aspect-square relative group cursor-pointer"
                                onClick={() => handlePostClick(post.id)}
                            >
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

export default UserProfilePage
