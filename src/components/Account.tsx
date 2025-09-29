import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Grid, Users, Calendar, MapPin, Camera } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface UserProfile {
  id: string
  name: string
  role: string
  bio?: string
  location?: string
  skills?: string[]
  avatar_url?: string
  created_at: string
  followers: string[]
  following: string[]
}

interface Post {
  id: string
  content: string
  images: string[]
  author_id: string
  author_name: string
  created_at: string
  likes: string[]
  comments: any[]
}

interface AccountProps {
  userId: string
  currentUser: User
  onNavigate: (page: string, id?: string) => void
}

export function Account({ userId, currentUser, onNavigate }: AccountProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
    loadUserPosts()
  }, [userId])

  const loadProfile = async () => {
    try {
      setError(null)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { profile: profileData } = await response.json()
        
        // Ensure all required properties exist with default values
        const safeProfile: UserProfile = {
          id: profileData.id || userId,
          name: profileData.name || 'Unknown User',
          role: profileData.role || 'student',
          bio: profileData.bio || '',
          location: profileData.location || '',
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
          avatar_url: profileData.avatar_url || '',
          created_at: profileData.created_at || new Date().toISOString(),
          followers: Array.isArray(profileData.followers) ? profileData.followers : [],
          following: Array.isArray(profileData.following) ? profileData.following : []
        }
        
        setProfile(safeProfile)
        setIsFollowing(safeProfile.followers.includes(currentUser.id))
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch profile' }))
        setError(errorData.error || 'Failed to load profile')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Network error while loading profile')
    } finally {
      setLoading(false)
    }
  }

  const loadUserPosts = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}/posts`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { posts: postsData } = await response.json()
        // Ensure posts is always an array
        const safePosts = Array.isArray(postsData) ? postsData.map((post: any) => ({
          ...post,
          images: Array.isArray(post.images) ? post.images : [],
          likes: Array.isArray(post.likes) ? post.likes : [],
          comments: Array.isArray(post.comments) ? post.comments : []
        })) : []
        setPosts(safePosts)
      }
    } catch (error) {
      console.error('Error loading user posts:', error)
      setPosts([]) // Set empty array on error
    }
  }

  const handleFollow = async () => {
    if (followLoading || !profile) return

    setFollowLoading(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: isFollowing ? 'unfollow' : 'follow'
        })
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setProfile({
          ...profile,
          followers: isFollowing 
            ? profile.followers.filter(id => id !== currentUser.id)
            : [...profile.followers, currentUser.id]
        })
      }
    } catch (error) {
      console.error('Error updating follow status:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const startConversation = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participant_id: userId
        })
      })

      if (response.ok) {
        onNavigate('messages')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-blue-100 text-blue-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPhotosFromPosts = () => {
    const photos: string[] = []
    posts.forEach(post => {
      if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        photos.push(...post.images)
      }
    })
    return photos
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'User not found'}
          </h2>
          <button
            onClick={() => onNavigate('feed')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Feed
          </button>
        </div>
      </div>
    )
  }

  const isOwnProfile = userId === currentUser.id
  const photos = getPhotosFromPosts()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigate('feed')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-theme-gradient rounded-xl border border-gray-200 p-8 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 avatar-gradient rounded-full flex items-center justify-center">
            {profile.avatar_url ? (
              <ImageWithFallback
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleColor(profile.role)}`}>
                  {profile.role}
                </span>
              </div>

              {!isOwnProfile && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50`}
                  >
                    {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    <span>{followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}</span>
                  </button>

                  <button
                    onClick={startConversation}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 mb-4 text-sm">
              <div>
                <span className="font-semibold text-gray-900">{posts.length}</span>
                <span className="text-gray-600 ml-1">posts</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{profile.followers.length}</span>
                <span className="text-gray-600 ml-1">followers</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{profile.following.length}</span>
                <span className="text-gray-600 ml-1">following</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-700 mb-3">{profile.bio}</p>
            )}

            {/* Location and Join Date */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {profile.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'posts'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>Posts</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'photos'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Photos</span>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center space-x-2 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Settings</span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-theme-gradient rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {post.images && post.images.length > 0 ? (
                  <div className="h-48 relative">
                    <ImageWithFallback
                      src={post.images[0]}
                      alt="Post image"
                      className="w-full h-full object-cover"
                    />
                    {post.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        +{post.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Text Post</p>
                    </div>
                  </div>
                )}
                
                <div className="p-4">
                  <p className="text-gray-900 text-sm line-clamp-3 mb-2">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(post.created_at)}</span>
                    <div className="flex items-center space-x-2">
                      <span>{post.likes.length} likes</span>
                      <span>{post.comments.length} comments</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? 'Share your first post!' : `${profile.name} hasn't shared any posts yet.`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="aspect-square relative overflow-hidden rounded-lg">
                <ImageWithFallback
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}

            {photos.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? 'Share photos in your posts to see them here!' : `${profile.name} hasn't shared any photos yet.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}