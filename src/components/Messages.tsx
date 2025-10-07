import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Search, Users, Phone, Video, MoreVertical, X, Eye, 
  UserPlus, UserCheck, ArrowLeft, Send, Plus, Paperclip,
  Image as ImageIcon, Smile, Bell, BellOff, MessageCircle
} from 'lucide-react'
import { User } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { projectId } from '../utils/supabase/info'

interface MessagesProps {
  user: User
  onNavigate: (page: string, id?: string) => void
  onUnreadCountChange?: (count: number) => void
  targetUserId?: string | null
}

interface UserProfile {
  id: string
  name: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  role: string
}

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
}

interface Conversation {
  id: string
  participants: string[]
  last_message?: Message | null
  participant?: {
    id: string
    name: string
    avatar_url?: string
  }
  messages?: Message[]
}

export function Messages({ user, onNavigate, onUnreadCountChange, targetUserId }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle mobile screen detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [])

  // Handle target user (start conversation with specific user)
  useEffect(() => {
    if (targetUserId) {
      startNewConversation(targetUserId)
    }
  }, [targetUserId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes < 1 ? 'Just now' : `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    }
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.participant) {
      return conversation.participant.name
    }
    return 'Unknown User'
  }

  // Load conversations from server
  const loadConversations = async () => {
    try {
      setError(null)
      
      if (!user.access_token) {
        console.error('❌ No access token available')
        setError('Authentication required')
        setLoading(false)
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const responseData = await response.json()
        const conversationsData = responseData?.conversations || []
        console.log('✅ Conversations loaded:', conversationsData.length)
        setConversations(conversationsData)
        
        // Calculate unread count (for now set to 0, can be enhanced later)
        onUnreadCountChange?.(0)
      } else if (response.status === 401) {
        console.error('❌ Unauthorized - invalid token')
        setError('Session expired. Please sign in again.')
      } else {
        console.error('❌ Failed to load conversations:', response.status, await response.text())
        setError('Failed to load conversations')
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { conversation } = await response.json()
        console.log('✅ Messages loaded for conversation:', conversationId)
        setMessages(conversation?.messages || [])
      } else {
        console.error('❌ Failed to load messages:', response.status)
        setError('Failed to load messages')
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      setError('Failed to load messages')
    }
  }

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setSearchingUsers(false)
      return
    }

    console.log('🔍 Searching for users:', query)
    setSearchingUsers(true)

    try {
      if (!user.access_token) {
        console.error('❌ No access token for search')
        setSearchResults([])
        setSearchingUsers(false)
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/search/users?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const responseData = await response.json()
        const users = responseData?.users || []
        const filteredUsers = users
          .filter((u: any) => u.id && u.id !== user.id) // Exclude current user and ensure valid ID
          .map((u: any) => ({
            id: u.id,
            name: u.name || 'Unknown User',
            role: u.role || 'student',
            avatar_url: u.avatar_url,
            status: 'offline' as const // Default status
          }))
        
        setSearchResults(filteredUsers)
        console.log(`✅ Found ${filteredUsers.length} users matching "${query}"`)
      } else if (response.status === 401) {
        console.error('❌ Unauthorized search request')
        setSearchResults([])
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
  }

  // Debounced user search
  const debouncedSearchUsers = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query)
    }, 300)
  }, [])

  // Start new conversation
  const startNewConversation = async (targetUserId: string) => {
    try {
      console.log('💬 Starting conversation with user:', targetUserId)
      setCreatingConversation(true)
      setError(null)
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participant_id: targetUserId
        })
      })

      if (response.ok) {
        const { conversation } = await response.json()
        console.log('✅ Conversation created/retrieved:', conversation.id)
        
        // Refresh conversations list
        await loadConversations()
        
        // Select the new conversation
        setSelectedConversation(conversation.id)
        await loadMessages(conversation.id)
        
        // Close modal and clear search
        setShowNewChatModal(false)
        setUserSearchQuery('')
        setSearchResults([])
        setSearchQuery('')
        
        if (isMobile) {
          setShowConversationList(false)
        }
      } else {
        console.error('❌ Error creating conversation:', response.status)
        setError('Failed to start conversation. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error starting conversation:', error)
      setError('Failed to start conversation. Please try again.')
    } finally {
      setCreatingConversation(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: messageContent
        })
      })

      if (response.ok) {
        const { conversation } = await response.json()
        console.log('✅ Message sent successfully')
        
        // Update messages
        setMessages(conversation?.messages || [])
        
        // Update conversations list to reflect new last message
        await loadConversations()
      } else {
        console.error('❌ Failed to send message:', response.status)
        setError('Failed to send message. Please try again.')
        setNewMessage(messageContent) // Restore message
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setError('Failed to send message. Please try again.')
      setNewMessage(messageContent) // Restore message
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle conversation selection
  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    await loadMessages(conversationId)
    
    if (isMobile) {
      setShowConversationList(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : ''}`}>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <X className="h-4 w-4" />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-2 p-1 hover:bg-destructive/80 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Conversations List */}
      <div className={`${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'} flex-col w-full ${!isMobile ? 'max-w-sm' : ''} post-card border-r`}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations or users"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                setSearchQuery(value)
                // Search users if there's a query, otherwise clear results
                if (value.trim()) {
                  debouncedSearchUsers(value)
                } else {
                  setSearchResults([])
                  setSearchingUsers(false)
                }
              }}
              className="input-clean w-full pl-10 pr-4 py-2"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setSearchingUsers(false)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && searchResults.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="btn-gradient px-4 py-2 rounded-lg mt-4"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <>
              {/* Existing Conversations */}
              {(() => {
                const filteredConversations = conversations.filter(conv => 
                  !searchQuery || 
                  getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
                )
                
                return (
                  <>
                    {searchQuery && filteredConversations.length > 0 && (
                      <div className="px-4 py-2 bg-muted/50 sticky top-0">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Your Conversations
                        </p>
                      </div>
                    )}
                    {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-secondary transition-colors ${
                    selectedConversation === conversation.id ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                      {conversation.participant?.avatar_url ? (
                        <ImageWithFallback
                          src={conversation.participant.avatar_url}
                          alt={getConversationName(conversation)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-white">
                          {getInitials(getConversationName(conversation))}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground truncate">
                          {getConversationName(conversation)}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatMessageTime(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      
                      {conversation.last_message ? (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                          {conversation.last_message.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </div>
                    ))}
                  </>
                )
              })()}
              
              {/* User Search Results */}
              {searchQuery.trim() && searchResults.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/50 sticky top-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Start a new chat
                    </p>
                  </div>
                  {searchResults.map((userProfile) => (
                    <div
                      key={userProfile.id}
                      onClick={() => {
                        if (!creatingConversation) {
                          startNewConversation(userProfile.id)
                        }
                      }}
                      className={`p-4 border-b cursor-pointer transition-colors ${
                        creatingConversation ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                          {userProfile.avatar_url ? (
                            <ImageWithFallback
                              src={userProfile.avatar_url}
                              alt={userProfile.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-white">
                              {getInitials(userProfile.name)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {userProfile.name}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {userProfile.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* No Results */}
              {searchQuery.trim() && 
               conversations.filter(conv => 
                 getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
               ).length === 0 && 
               searchResults.length === 0 && (
                <div className="p-8 text-center">
                  {searchingUsers ? (
                    <>
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-muted-foreground">Searching users...</p>
                    </>
                  ) : (
                    <>
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No conversations or users found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try searching with a different name
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'} flex-col flex-1`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b post-card flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button
                    onClick={() => setShowConversationList(true)}
                    className="p-1 hover:bg-secondary rounded-lg mr-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                
                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                  {(() => {
                    const conversation = conversations.find(c => c.id === selectedConversation)
                    const participant = conversation?.participant
                    return participant?.avatar_url ? (
                      <ImageWithFallback
                        src={participant.avatar_url}
                        alt={participant.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {participant ? getInitials(participant.name) : '?'}
                      </span>
                    )
                  })()}
                </div>
                
                <div>
                  <h3 className="font-medium">
                    {(() => {
                      const conversation = conversations.find(c => c.id === selectedConversation)
                      return conversation?.participant?.name || 'Unknown User'
                    })()}
                  </h3>
                  <p className="text-sm text-muted-foreground">Last seen recently</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-secondary rounded-lg">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg">
                  <Video className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t post-card">
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-secondary rounded-lg">
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    disabled={sendingMessage}
                    className="input-clean w-full px-4 py-2 pr-12"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary rounded">
                    <Smile className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="btn-gradient p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-6">Choose a conversation from the sidebar to start messaging</p>
              {isMobile && (
                <button
                  onClick={() => setShowConversationList(true)}
                  className="btn-gradient px-4 py-2 rounded-lg"
                >
                  View Conversations
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="post-card rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">New Chat</h3>
              <button
                onClick={() => {
                  setShowNewChatModal(false)
                  setUserSearchQuery('')
                  setSearchResults([])
                }}
                className="p-1 hover:bg-secondary rounded-lg"
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
                  value={userSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setUserSearchQuery(value)
                    // Search users if there's a query, otherwise clear results
                    if (value.trim()) {
                      debouncedSearchUsers(value)
                    } else {
                      setSearchResults([])
                      setSearchingUsers(false)
                    }
                  }}
                  className="input-clean w-full pl-10 pr-4 py-2"
                  autoFocus
                />
                {userSearchQuery && (
                  <button
                    onClick={() => {
                      setUserSearchQuery('')
                      setSearchResults([])
                      setSearchingUsers(false)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {searchingUsers ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((userProfile) => (
                    <div
                      key={userProfile.id}
                      onClick={() => {
                        if (!creatingConversation) {
                          startNewConversation(userProfile.id)
                        }
                      }}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
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
                    </div>
                  ))
                ) : userSearchQuery.trim() ? (
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
      )}
    </div>
  )
}
