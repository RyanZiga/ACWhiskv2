import React, { useState, useEffect } from 'react'
import { User as UserIcon, Edit, Save, X, Upload, Camera } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  bio: string
  location: string
  skills: string[]
  avatar_url: string
  created_at: string
  followers: string[]
  following: string[]
  privacy_settings: {
    profile_visible: boolean
    posts_visible: boolean
    photos_visible: boolean
  }
}

interface ProfileProps {
  user: User
  onNavigate: (page: string) => void
}

export function Profile({ user, onNavigate }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    skills: '',
    privacy_settings: {
      profile_visible: true,
      posts_visible: true,
      photos_visible: true
    }
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { profile } = await response.json()
        setProfile(profile)
        setFormData({
          name: profile.name || '',
          bio: profile.bio || '',
          location: profile.location || '',
          skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
          privacy_settings: profile.privacy_settings || {
            profile_visible: true,
            posts_visible: true,
            photos_visible: true
          }
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/upload/avatars`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        },
        body: formData
      })

      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json()
        

        const updateResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatar_url: url })
        })

        if (updateResponse.ok) {
          const { profile: updatedProfile } = await updateResponse.json()
          setProfile(updatedProfile)
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = {
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        privacy_settings: formData.privacy_settings
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const { profile: updatedProfile } = await response.json()
        setProfile(updatedProfile)
        setEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
        privacy_settings: profile.privacy_settings || {
          profile_visible: true,
          posts_visible: true,
          photos_visible: true
        }
      })
    }
    setEditing(false)
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

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Profile not found</h2>
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="post-card shadow-sm">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
            
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center space-x-2 btn-gradient px-4 py-2 rounded-lg"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 btn-secondary px-4 py-2 rounded-lg"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 btn-gradient px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Profile Picture Section */}
          <div className="flex items-center space-x-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 avatar-gradient rounded-full flex items-center justify-center">
                {profile.avatar_url ? (
                  <ImageWithFallback
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-12 w-12 text-white" />
                )}
              </div>
              
              {editing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
              
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">{profile.name}</h2>
              <p className="text-muted-foreground capitalize">{profile.role}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click the profile picture to change it
                </p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Personal Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Display Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 input-clean"
                    />
                  ) : (
                    <p className="py-2 text-foreground">{profile.name || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bio
                  </label>
                  {editing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 input-clean resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="py-2 text-foreground">{profile.bio || 'No bio available'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Location
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 input-clean"
                      placeholder="City, Country"
                    />
                  ) : (
                    <p className="py-2 text-foreground">{profile.location || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Skills & Interests
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      className="w-full px-3 py-2 input-clean"
                      placeholder="Baking, Italian cuisine, Pastry..."
                    />
                  ) : (
                    <div className="py-2">
                      {profile.skills && profile.skills.length > 0 ? (
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
                      ) : (
                        <p className="text-foreground">No skills specified</p>
                      )}
                    </div>
                  )}
                  {editing && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate skills with commas
                    </p>
                  )}
                </div>
              </div>
            </div>


            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                  </div>
                  {editing ? (
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.profile_visible}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy_settings: {
                          ...formData.privacy_settings,
                          profile_visible: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.privacy_settings?.profile_visible 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-destructive text-destructive-foreground'
                    }`}>
                      {profile.privacy_settings?.profile_visible ? 'Public' : 'Private'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Posts Visibility</p>
                    <p className="text-sm text-muted-foreground">Show your posts to other users</p>
                  </div>
                  {editing ? (
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.posts_visible}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy_settings: {
                          ...formData.privacy_settings,
                          posts_visible: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.privacy_settings?.posts_visible 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-destructive text-destructive-foreground'
                    }`}>
                      {profile.privacy_settings?.posts_visible ? 'Public' : 'Private'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Photos Visibility</p>
                    <p className="text-sm text-muted-foreground">Show your photos to other users</p>
                  </div>
                  {editing ? (
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.photos_visible}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacy_settings: {
                          ...formData.privacy_settings,
                          photos_visible: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.privacy_settings?.photos_visible 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-destructive text-destructive-foreground'
                    }`}>
                      {profile.privacy_settings?.photos_visible ? 'Public' : 'Private'}
                    </span>
                  )}
                </div>
              </div>


              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Account Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">{profile.followers?.length || 0}</p>
                    <p className="text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">{profile.following?.length || 0}</p>
                    <p className="text-muted-foreground">Following</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}