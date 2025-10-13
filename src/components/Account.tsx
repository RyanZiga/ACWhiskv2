import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Grid, Users, Calendar, MapPin, Camera, Award, ChefHat, Star, TrendingUp } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { isValidUUID } from '../utils/auth'

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
  portfolio?: {
    specialty_dishes?: string[]
    cooking_techniques?: string[]
    achievements?: string[]
    experience?: string
    certifications?: string[]
  }
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
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false)

  useEffect(() => {
    loadProfile()
    loadUserPosts()
  }, [userId])

  const loadProfile = async () => {
    try {
      setError(null)
      
      // Validate userId before making API call
      if (!isValidUUID(userId)) {
        console.error('Invalid user ID:', userId)
        setError('Invalid user ID')
        setLoading(false)
        return
      }
      
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
          following: Array.isArray(profileData.following) ? profileData.following : [],
          portfolio: profileData.portfolio || {
            specialty_dishes: [],
            cooking_techniques: [],
            achievements: [],
            experience: '',
            certifications: []
          }
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

  const startConversation = () => {
    // Navigate to messages page with the target user
    onNavigate('messages', `user:${userId}`)
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
      case 'instructor': return 'bg-primary text-primary-foreground'
      case 'admin': return 'bg-accent text-accent-foreground'
      default: return 'bg-muted text-muted-foreground'
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
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {error || 'User not found'}
          </h2>
          <button
            onClick={() => onNavigate('feed')}
            className="btn-gradient px-4 py-2 rounded-lg"
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
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="post-card p-8 mb-8 shadow-sm">
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
                <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
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
                        ? 'btn-secondary'
                        : 'btn-gradient'
                    } disabled:opacity-50`}
                  >
                    {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    <span>{followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}</span>
                  </button>

                  <button
                    onClick={startConversation}
                    className="flex items-center space-x-2 btn-secondary px-4 py-2 rounded-lg"
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
                <span className="font-semibold text-foreground">{posts.length}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">{profile.followers.length}</span>
                <span className="text-muted-foreground ml-1">followers</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">{profile.following.length}</span>
                <span className="text-muted-foreground ml-1">following</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-foreground mb-3">{profile.bio}</p>
            )}

            {/* Location and Join Date */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
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
                      className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-foreground mb-2">Portfolio</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  {profile.portfolio.specialty_dishes && profile.portfolio.specialty_dishes.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold text-foreground">Specialty Dishes</h2>
                      {profile.portfolio.specialty_dishes.map((dish, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                        >
                          {dish}
                        </span>
                      ))}
                    </div>
                  )}

                  {profile.portfolio.cooking_techniques && profile.portfolio.cooking_techniques.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold text-foreground">Cooking Techniques</h2>
                      {profile.portfolio.cooking_techniques.map((technique, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                        >
                          {technique}
                        </span>
                      ))}
                    </div>
                  )}

                  {profile.portfolio.achievements && profile.portfolio.achievements.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold text-foreground">Achievements</h2>
                      {profile.portfolio.achievements.map((achievement, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                        >
                          {achievement}
                        </span>
                      ))}
                    </div>
                  )}

                  {profile.portfolio.experience && (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold text-foreground">Experience</h2>
                      <p className="text-foreground text-sm">{profile.portfolio.experience}</p>
                    </div>
                  )}

                  {profile.portfolio.certifications && profile.portfolio.certifications.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold text-foreground">Certifications</h2>
                      {profile.portfolio.certifications.map((certification, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                        >
                          {certification}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>Posts</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'photos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Photos</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'portfolio'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Portfolio</span>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center space-x-2 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
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
              <div key={post.id} className="post-card overflow-hidden shadow-sm">
                {post.images && post.images.length > 0 ? (
                  <div className="h-48 relative">
                    <ImageWithFallback
                      src={post.images[0]}
                      alt="Post image"
                      className="w-full h-full object-cover"
                    />
                    {post.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        +{post.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-muted-foreground/20 rounded-full mx-auto mb-2"></div>
                      <p className="text-muted-foreground text-sm">Text Post</p>
                    </div>
                  </div>
                )}
                
                <div className="p-4">
                  <p className="text-foreground text-sm line-clamp-3 mb-2">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground">
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile ? 'Share photos in your posts to see them here!' : `${profile.name} hasn't shared any photos yet.`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Portfolio Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Culinary Portfolio</h2>
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingPortfolio(!isEditingPortfolio)}
                  className="btn-gradient px-4 py-2 rounded-lg text-sm"
                >
                  {isEditingPortfolio ? 'Save Changes' : 'Edit Portfolio'}
                </button>
              )}
            </div>

            {/* Experience Section */}
            {(profile.portfolio?.experience || isOwnProfile) && (
              <div className="post-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Experience</h3>
                </div>
                {isEditingPortfolio ? (
                  <textarea
                    className="input-clean w-full p-3 min-h-[120px] resize-none"
                    placeholder="Describe your culinary experience, journey, and expertise..."
                    defaultValue={profile.portfolio?.experience || ''}
                  />
                ) : (
                  <p className="text-foreground">
                    {profile.portfolio?.experience || 'No experience added yet'}
                  </p>
                )}
              </div>
            )}

            {/* Specialty Dishes */}
            {((profile.portfolio?.specialty_dishes && profile.portfolio.specialty_dishes.length > 0) || isOwnProfile) && (
              <div className="post-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Specialty Dishes</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.portfolio?.specialty_dishes?.map((dish, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-3 bg-muted rounded-lg"
                    >
                      <Star className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="text-foreground">{dish}</span>
                    </div>
                  ))}
                  {(!profile.portfolio?.specialty_dishes || profile.portfolio.specialty_dishes.length === 0) && (
                    <p className="text-muted-foreground col-span-full">
                      {isOwnProfile ? 'Add your signature dishes' : 'No specialty dishes listed'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cooking Techniques */}
            {((profile.portfolio?.cooking_techniques && profile.portfolio.cooking_techniques.length > 0) || isOwnProfile) && (
              <div className="post-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Mastered Techniques</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.portfolio?.cooking_techniques?.map((technique, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium"
                    >
                      {technique}
                    </span>
                  ))}
                  {(!profile.portfolio?.cooking_techniques || profile.portfolio.cooking_techniques.length === 0) && (
                    <p className="text-muted-foreground">
                      {isOwnProfile ? 'Add cooking techniques you\'ve mastered' : 'No techniques listed'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Achievements & Certifications */}
            {((profile.portfolio?.achievements && profile.portfolio.achievements.length > 0) || 
              (profile.portfolio?.certifications && profile.portfolio.certifications.length > 0) || 
              isOwnProfile) && (
              <div className="post-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Achievements & Certifications</h3>
                </div>
                <div className="space-y-3">
                  {profile.portfolio?.achievements?.map((achievement, index) => (
                    <div
                      key={`achievement-${index}`}
                      className="flex items-start space-x-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-foreground">{achievement}</p>
                    </div>
                  ))}
                  {profile.portfolio?.certifications?.map((cert, index) => (
                    <div
                      key={`cert-${index}`}
                      className="flex items-start space-x-3 p-3 bg-accent/20 rounded-lg border border-accent"
                    >
                      <Award className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-foreground font-medium">{cert}</p>
                    </div>
                  ))}
                  {(!profile.portfolio?.achievements || profile.portfolio.achievements.length === 0) &&
                   (!profile.portfolio?.certifications || profile.portfolio.certifications.length === 0) && (
                    <p className="text-muted-foreground">
                      {isOwnProfile ? 'Add your achievements and certifications' : 'No achievements or certifications listed'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isOwnProfile && 
             (!profile.portfolio?.experience && 
              (!profile.portfolio?.specialty_dishes || profile.portfolio.specialty_dishes.length === 0) &&
              (!profile.portfolio?.cooking_techniques || profile.portfolio.cooking_techniques.length === 0) &&
              (!profile.portfolio?.achievements || profile.portfolio.achievements.length === 0) &&
              (!profile.portfolio?.certifications || profile.portfolio.certifications.length === 0)) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No portfolio yet</h3>
                <p className="text-muted-foreground">
                  {profile.name} hasn't built their culinary portfolio yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}