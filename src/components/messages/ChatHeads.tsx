import React, { useState, useEffect } from 'react'
import { Search, Users, MessageCircle, Plus, X, Check, UserCheck, UserPlus, Heart, Eye } from 'lucide-react'
import { getInitials } from './helpers'
import { projectId } from '../../utils/supabase/info'
import { GlassCard, GlassButton } from '../ui/glass-card'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Contact {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  avatar?: string
  online?: boolean
  isFollowing?: boolean
  isFollower?: boolean
  mutualConnections?: number
  lastActive?: string
  bio?: string
}

interface ChatHeadsProps {
  currentUser: User
  onStartConversation: (userId: string) => void
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

export function ChatHeads({ currentUser, onStartConversation, onClose, onViewProfile }: ChatHeadsProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [followedUsers, setFollowedUsers] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'following' | 'contacts' | 'search'>('following')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'search' && searchQuery.trim()) {
      searchUsers(searchQuery)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, activeTab])

  const loadData = async () => {
    try {
      await Promise.all([
        loadContacts(),
        loadFollowedUsers()
      ])
    } catch (error) {
      console.error('Error loading chat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/contacts`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { contacts: userContacts } = await response.json()
        setContacts(userContacts || [])
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      setContacts([])
    }
  }

  const loadFollowedUsers = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/following`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { following } = await response.json()
        // Process followed users to include messaging-relevant info
        const processedFollowing = (following || []).map((user: any) => ({
          ...user,
          isFollowing: true,
          online: user.online || false,
          lastActive: user.last_active || new Date().toISOString()
        }))
        setFollowedUsers(processedFollowing)
      }
    } catch (error) {
      console.error('Error loading followed users:', error)
      setFollowedUsers([])
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/search?q=${encodeURIComponent(query)}&include_follow_info=true`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { users } = await response.json()
        // Filter out current user and add follow information
        const filteredUsers = (users || [])
          .filter((user: Contact) => user.id !== currentUser.id)
          .map((user: any) => ({
            ...user,
            isFollowing: user.is_following || false,
            isFollower: user.is_follower || false,
            mutualConnections: user.mutual_connections || 0,
            online: user.online || false
          }))
        setSearchResults(filteredUsers)
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Update local state
        setSearchResults(prev =>
          prev.map(user =>
            user.id === userId
              ? { ...user, isFollowing: true }
              : user
          )
        )
        // Refresh followed users
        loadFollowedUsers()
      }
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}/unfollow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Update local state
        setSearchResults(prev =>
          prev.map(user =>
            user.id === userId
              ? { ...user, isFollowing: false }
              : user
          )
        )
        // Refresh followed users
        loadFollowedUsers()
      }
    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }

  const handleContactSelect = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    } else {
      setSelectedContacts(prev => [...prev, contactId])
    }
  }

  const handleStartConversation = () => {
    if (selectedContacts.length === 1) {
      onStartConversation(selectedContacts[0])
    } else if (selectedContacts.length > 1) {
      // Create group conversation
      console.log('Create group conversation with:', selectedContacts)
      onStartConversation('group_' + selectedContacts.join('_'))
    }
    onClose()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor':
        return 'bg-blue-100 text-blue-700'
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getDisplayContacts = () => {
    switch (activeTab) {
      case 'following':
        return followedUsers.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      case 'contacts':
        return contacts.filter(contact =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      case 'search':
        return searchResults
      default:
        return []
    }
  }

  const displayContacts = getDisplayContacts()

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return 'Unknown'
    
    const now = new Date()
    const activeDate = new Date(lastActive)
    const diffInMinutes = Math.floor((now.getTime() - activeDate.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return activeDate.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading contacts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-white/20 dark:border-gray-700/30">
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors touch-target ${
            activeTab === 'following'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-1">
            <Heart className="h-4 w-4" />
            <span>Following</span>
            <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm">
              {followedUsers.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors touch-target ${
            activeTab === 'contacts'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-1">
            <Users className="h-4 w-4" />
            <span>Contacts</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors touch-target ${
            activeTab === 'search'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center space-x-1">
            <Search className="h-4 w-4" />
            <span>Search</span>
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder={
            activeTab === 'following' ? 'Search following...' :
            activeTab === 'contacts' ? 'Search contacts...' : 
            'Search users...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Selected Contacts Summary */}
      {selectedContacts.length > 0 && (
        <GlassCard className="p-3 border-purple-200/30 dark:border-purple-400/30 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {selectedContacts.slice(0, 3).map((contactId) => {
                  const contact = displayContacts.find(c => c.id === contactId)
                  return (
                    <div
                      key={contactId}
                      className="w-6 h-6 bg-custom-gradient rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800"
                    >
                      <span className="text-white text-xs font-medium">
                        {getInitials(contact?.name || '')}
                      </span>
                    </div>
                  )
                })}
                {selectedContacts.length > 3 && (
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs font-medium">
                      +{selectedContacts.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                {selectedContacts.length} selected
              </span>
            </div>
            <GlassButton
              onClick={() => setSelectedContacts([])}
              variant="secondary"
              className="p-1 touch-target"
            >
              <X className="h-4 w-4" />
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Contacts List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayContacts.length > 0 ? (
          displayContacts.map((contact) => {
            const isSelected = selectedContacts.includes(contact.id)
            
            return (
              <GlassCard
                key={contact.id}
                className={`flex items-center space-x-3 p-3 cursor-pointer transition-all duration-200 touch-target ${
                  isSelected
                    ? 'border-purple-300/50 dark:border-purple-400/50 bg-purple-500/10'
                    : 'hover:bg-white/60 dark:hover:bg-gray-800/60 border-transparent'
                }`}
              >
                {/* Selection Checkbox */}
                <div 
                  onClick={() => handleContactSelect(contact.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors backdrop-blur-sm ${
                    isSelected
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 bg-white/50 dark:bg-gray-800/50'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {getInitials(contact.name)}
                    </span>
                  </div>
                  {contact.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize backdrop-blur-sm ${getRoleColor(contact.role)}`}>
                        {contact.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      {contact.isFollowing && (
                        <span className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                          <UserCheck className="h-3 w-3" />
                          <span>Following</span>
                        </span>
                      )}
                      {contact.isFollower && !contact.isFollowing && (
                        <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                          <UserPlus className="h-3 w-3" />
                          <span>Follows you</span>
                        </span>
                      )}
                      {contact.mutualConnections && contact.mutualConnections > 0 && (
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{contact.mutualConnections} mutual</span>
                        </span>
                      )}
                    </div>
                    
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {contact.online ? 'Online' : formatLastActive(contact.lastActive)}
                    </span>
                  </div>

                  {contact.bio && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {contact.bio}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Follow/Unfollow Button for Search Tab */}
                  {activeTab === 'search' && (
                    <GlassButton
                      onClick={(e) => {
                        e.stopPropagation()
                        if (contact.isFollowing) {
                          handleUnfollow(contact.id)
                        } else {
                          handleFollow(contact.id)
                        }
                      }}
                      variant={contact.isFollowing ? "primary" : "secondary"}
                      className="p-1.5 touch-target"
                    >
                      {contact.isFollowing ? (
                        <UserCheck className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </GlassButton>
                  )}

                  {/* View Profile Button */}
                  {onViewProfile && (
                    <GlassButton
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewProfile(contact.id)
                        onClose()
                      }}
                      variant="secondary"
                      className="p-1.5 touch-target"
                    >
                      <Eye className="h-4 w-4" />
                    </GlassButton>
                  )}

                  {/* Quick Message Button */}
                  <GlassButton
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartConversation(contact.id)
                      onClose()
                    }}
                    variant="primary"
                    className="p-1.5 touch-target"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </GlassButton>
                </div>
              </GlassCard>
            )
          })
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            {activeTab === 'following' ? (
              <div>
                <p>No followed users yet</p>
                <p className="text-sm mt-1">Follow other users to see them here</p>
              </div>
            ) : activeTab === 'contacts' ? (
              <div>
                <p>No contacts found</p>
                <p className="text-sm mt-1">Connect with other users to start conversations</p>
              </div>
            ) : (
              <div>
                {searchQuery ? (
                  <div>
                    <p>No users found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div>
                    <p>Search for users</p>
                    <p className="text-sm mt-1">Find other members to start conversations</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedContacts.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/20 dark:border-gray-700/30">
          <GlassButton
            onClick={() => setSelectedContacts([])}
            variant="secondary"
            className="px-4 py-2 touch-target"
          >
            Clear
          </GlassButton>
          <GlassButton
            onClick={handleStartConversation}
            variant="primary"
            className="px-6 py-2 flex items-center space-x-2 touch-target"
          >
            <MessageCircle className="h-4 w-4" />
            <span>
              {selectedContacts.length === 1 ? 'Start Chat' : `Start Group (${selectedContacts.length})`}
            </span>
          </GlassButton>
        </div>
      )}
    </div>
  )
}