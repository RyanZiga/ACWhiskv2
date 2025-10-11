import React, { useState, useEffect, useCallback } from 'react'
import { Search, X, Users, Loader2 } from 'lucide-react'
import { User } from '../../utils/auth'
import { ImageWithFallback } from '../figma/ImageWithFallback'
import { projectId } from '../../utils/supabase/info'

interface UserProfile {
  id: string
  name: string
  avatar_url?: string
  role: string
}

interface NewChatModalProps {
  currentUser: User
  onClose: () => void
  onStartConversation: (userId: string) => void
}

export function NewChatModal({
  currentUser,
  onClose,
  onStartConversation
}: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Search for users with debouncing
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setSearchingUsers(false)
      return
    }

    console.log('🔍 Searching for users:', query)
    setSearchingUsers(true)

    try {
      if (!currentUser.access_token) {
        console.error('❌ No access token for search')
        setSearchResults([])
        setSearchingUsers(false)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/search/users?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const responseData = await response.json()
        const users = responseData?.users || []
        const filteredUsers = users
          .filter((u: any) => u.id && u.id !== currentUser.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name || 'Unknown User',
            role: u.role || 'student',
            avatar_url: u.avatar_url
          }))
        
        setSearchResults(filteredUsers)
        console.log(`✅ Found ${filteredUsers.length} users matching "${query}"`)
      } else {
        console.error('❌ User search failed:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('❌ User search error:', error)
      setSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }, [currentUser.access_token, currentUser.id])

  // Debounced user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
        setSearchingUsers(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUsers])

  const handleStartConversation = async (userId: string) => {
    setCreatingConversation(true)
    try {
      await onStartConversation(userId)
    } finally {
      setCreatingConversation(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="post-card rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden modal-responsive">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">New Chat</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean w-full pl-10 pr-4 py-2"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary rounded touch-target"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {searchingUsers ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((userProfile) => (
                <div
                  key={userProfile.id}
                  onClick={() => {
                    if (!creatingConversation) {
                      handleStartConversation(userProfile.id)
                    }
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors touch-target ${
                    creatingConversation ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'
                  }`}
                >
                  <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                    {userProfile.avatar_url ? (
                      <ImageWithFallback
                        src={userProfile.avatar_url}
                        alt={userProfile.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {getInitials(userProfile.name)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{userProfile.name}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
                  </div>
                  {creatingConversation && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              ))
            ) : searchQuery.trim() ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Start typing to search for users</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
