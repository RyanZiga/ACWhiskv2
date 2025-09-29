import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Search, Users, Phone, Video, MoreVertical, X, Eye, 
  UserPlus, UserCheck, ArrowLeft, Send, Plus, Paperclip,
  Image as ImageIcon, Smile, Bell, BellOff, MessageCircle
} from 'lucide-react'
import { User } from '../utils/auth'
import { getAuthenticatedClient } from '../utils/supabase/client'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface MessagesProps {
  user: User
  onNavigate: (page: string, id?: string) => void
  onUnreadCountChange?: (count: number) => void
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
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'voice' | 'system'
  file_url?: string
  file_name?: string
  reply_to_id?: string
  created_at: string
  edited_at?: string
  reactions?: Array<{
    emoji: string
    count: number
    users: string[]
  }>
}

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  description?: string
  avatar_url?: string
  participants: UserProfile[]
  last_message?: {
    content: string
    sender_id: string
    sender_name: string
    created_at: string
  }
  unread_count: number
  participant_count: number
  created_at: string
  updated_at: string
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 48) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

export function Messages({ user, onNavigate, onUnreadCountChange }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'new_message'
    message: string
    sender: string
    conversation_id: string
    timestamp: string
  }>>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
      markConversationAsRead(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      const supabase = getAuthenticatedClient()
      
      // First try to get conversations using the RPC function
      let conversationsData = []
      
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_conversations_with_details', { user_uuid: user.id })
        
        if (!rpcError && rpcData) {
          conversationsData = rpcData
        }
      } catch (rpcError) {
        console.warn('RPC function not available, falling back to direct queries')
      }
      
      // If RPC failed, fall back to direct table queries
      if (conversationsData.length === 0) {
        const { data: directData, error: directError } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_participants!inner (
              user_id,
              last_read_at
            )
          `)
          .eq('conversation_participants.user_id', user.id)
          .is('conversation_participants.left_at', null)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
        
        if (directError) {
          console.error('Error loading conversations:', directError)
          setConversations([])
          return
        }
        
        conversationsData = directData || []
      }

      // Transform the data to match our interface
      const transformedConversations: Conversation[] = await Promise.all(
        conversationsData.map(async (conv: any) => {
          try {
            // Get participants for this conversation
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select(`
                user_id,
                user_profiles (
                  id,
                  name,
                  avatar_url,
                  status,
                  role
                )
              `)
              .eq('conversation_id', conv.conversation_id || conv.id)
              .is('left_at', null)

            const participantProfiles: UserProfile[] = participants?.map((p: any) => ({
              id: p.user_profiles?.id || p.user_id,
              name: p.user_profiles?.name || 'Unknown User',
              avatar_url: p.user_profiles?.avatar_url,
              status: p.user_profiles?.status || 'offline',
              role: p.user_profiles?.role || 'student'
            })) || []

            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select(`
                content,
                sender_id,
                created_at,
                user_profiles!sender_id (name)
              `)
              .eq('conversation_id', conv.conversation_id || conv.id)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              id: conv.conversation_id || conv.id,
              type: conv.conversation_type || conv.type,
              name: conv.conversation_name || conv.name,
              description: conv.conversation_description || conv.description,
              avatar_url: conv.conversation_avatar_url || conv.avatar_url,
              participants: participantProfiles,
              last_message: lastMessage ? {
                content: lastMessage.content,
                sender_id: lastMessage.sender_id,
                sender_name: lastMessage.user_profiles?.name || 'Unknown User',
                created_at: lastMessage.created_at
              } : undefined,
              unread_count: 0, // Will be calculated separately
              participant_count: participantProfiles.length,
              created_at: conv.conversation_created_at || conv.created_at,
              updated_at: conv.conversation_updated_at || conv.updated_at
            }
          } catch (error) {
            console.error('Error processing conversation:', error)
            return null
          }
        })
      )

      const validConversations = transformedConversations.filter(Boolean) as Conversation[]
      setConversations(validConversations)
      
      // Update unread count
      const totalUnread = validConversations.reduce((sum, conv) => sum + conv.unread_count, 0)
      onUnreadCountChange?.(totalUnread)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const supabase = getAuthenticatedClient()
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles (
            id,
            name,
            avatar_url
          ),
          reactions:message_reactions (
            emoji,
            user_id,
            user_profiles!user_id (name)
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        setMessages([])
        return
      }

      const transformedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender?.name || user.name || 'Unknown User',
        sender_avatar: msg.sender?.avatar_url,
        content: msg.content,
        message_type: msg.message_type,
        file_url: msg.file_url,
        file_name: msg.file_name,
        reply_to_id: msg.reply_to_id,
        created_at: msg.created_at,
        edited_at: msg.edited_at,
        reactions: msg.reactions ? groupReactions(msg.reactions) : []
      }))

      setMessages(transformedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }
  }

  const groupReactions = (reactions: any[]): Array<{emoji: string, count: number, users: string[]}> => {
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: []
        }
      }
      acc[reaction.emoji].count++
      acc[reaction.emoji].users.push(reaction.user_profiles.name)
      return acc
    }, {})
    
    return Object.values(grouped)
  }

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const supabase = getAuthenticatedClient()
      await supabase.rpc('mark_conversation_as_read', {
        conv_uuid: conversationId,
        user_uuid: user.id
      })
      
      // Update local state
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
        
        // Update unread count
        const totalUnread = updated.reduce((sum, conv) => sum + conv.unread_count, 0)
        onUnreadCountChange?.(totalUnread)
        
        return updated
      })
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const supabase = getAuthenticatedClient()
      
      // Try user_profiles first, then fall back to auth.users
      let { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, avatar_url, status, role')
        .ilike('name', `%${query}%`)
        .neq('id', user.id)
        .limit(10)

      // If user_profiles doesn't exist, try auth.users
      if (error && error.code === '42P01') {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
        
        if (!authError && authData?.users) {
          const filteredUsers = authData.users
            .filter(u => 
              u.id !== user.id && 
              u.user_metadata?.name?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 10)
            .map(u => ({
              id: u.id,
              name: u.user_metadata?.name || u.email || 'Unknown User',
              avatar_url: u.user_metadata?.avatar_url,
              status: 'offline' as const,
              role: u.user_metadata?.role || 'student'
            }))
          
          setSearchResults(filteredUsers)
          return
        }
      }

      if (!error && data) {
        setSearchResults(data.map(u => ({
          ...u,
          status: (u.status || 'offline') as 'online' | 'offline' | 'away'
        })))
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    }
  }

  const startNewConversation = async (targetUserId: string) => {
    try {
      const supabase = getAuthenticatedClient()
      
      const { data, error } = await supabase
        .rpc('get_or_create_direct_conversation', {
          user1_uuid: user.id,
          user2_uuid: targetUserId
        })

      if (!error && data) {
        await loadConversations() // Refresh conversations
        setSelectedConversation(data)
        setShowNewChatModal(false)
        setUserSearchQuery('')
        setSearchResults([])
        
        if (isMobile) {
          setShowConversationList(false)
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation,
      sender_id: user.id,
      sender_name: user.name,
      sender_avatar: user.avatar_url,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      reactions: []
    }

    setMessages(prev => [...prev, tempMessage])

    try {
      const supabase = getAuthenticatedClient()
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        }])
        .select(`
          *,
          sender:user_profiles (
            id,
            name,
            avatar_url
          )
        `)
        .single()

      if (!error && data) {
        const newMsg: Message = {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          sender_name: data.sender?.name || user.name,
          sender_avatar: data.sender?.avatar_url,
          content: data.content,
          message_type: data.message_type,
          created_at: data.created_at,
          reactions: []
        }

        // Replace temp message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? newMsg : msg
        ))
        
        loadConversations() // Refresh to update last message
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        setNewMessage(messageContent) // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId)
    if (isMobile) {
      setShowConversationList(false)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    
    if (conv.type === 'direct') {
      const otherUser = conv.participants.find(p => p.id !== user.id)
      return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
    } else {
      return conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
    }
  })

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unread_count, 0)

  // Show notification when new message arrives
  const showNotification = useCallback((message: Message, conversationId: string) => {
    if (message.sender_id !== user.id && selectedConversation !== conversationId) {
      const notification = {
        id: `notif-${Date.now()}`,
        type: 'new_message' as const,
        message: message.content,
        sender: message.sender_name,
        conversation_id: conversationId,
        timestamp: message.created_at
      }
      
      setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 latest
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 5000)
    }
  }, [user.id, selectedConversation])

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient relative">
      {/* Notification Banner */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm animate-slide-down"
              onClick={() => {
                const conv = conversations.find(c => c.id === notif.conversation_id)
                if (conv) {
                  setSelectedConversation(conv.id)
                  if (isMobile) setShowConversationList(false)
                }
                setNotifications(prev => prev.filter(n => n.id !== notif.id))
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{notif.sender}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setNotifications(prev => prev.filter(n => n.id !== notif.id))
                  }}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-screen flex">
        {/* Conversation List Sidebar */}
        <div className={`${
          isMobile 
            ? (showConversationList ? 'block' : 'hidden') 
            : 'block'
          } w-full lg:w-80 bg-card border-r border-border flex flex-col`}
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-foreground">Messages</h1>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center space-x-2 px-3 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversation === conversation.id
                  const otherUser = conversation.type === 'direct' 
                    ? conversation.participants.find(p => p.id !== user.id)
                    : null
                  const isOnline = otherUser?.status === 'online'
                  
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {conversation.type === 'direct' && otherUser ? (
                            <>
                              {otherUser.avatar_url ? (
                                <ImageWithFallback
                                  src={otherUser.avatar_url}
                                  alt={otherUser.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {getInitials(otherUser.name)}
                                  </span>
                                </div>
                              )}
                              {/* Online indicator */}
                              {isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                              )}
                            </>
                          ) : (
                            <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                              <Users className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-medium truncate ${
                              conversation.unread_count > 0 ? 'text-foreground' : 'text-card-foreground'
                            }`}>
                              {conversation.type === 'direct' 
                                ? otherUser?.name 
                                : conversation.name
                              }
                            </h3>
                            {conversation.last_message && (
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                {formatMessageTime(conversation.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          
                          {conversation.last_message && (
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${
                                conversation.unread_count > 0 
                                  ? 'text-foreground font-medium' 
                                  : 'text-muted-foreground'
                              }`}>
                                {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                                {conversation.last_message.content}
                              </p>
                              
                              {/* Unread badge */}
                              {conversation.unread_count > 0 && (
                                <div className="ml-2 flex-shrink-0">
                                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
                                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-medium text-card-foreground mb-2">No conversations found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search term' : 'Start your first conversation'}
                  </p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${
          isMobile 
            ? (selectedConversation && !showConversationList ? 'block' : 'hidden') 
            : 'block'
          } flex-1 bg-background flex flex-col`}
        >
          {selectedConversation && selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-card border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Mobile back button */}
                    {isMobile && (
                      <button
                        onClick={() => setShowConversationList(true)}
                        className="p-2 hover:bg-muted/50 rounded-lg"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    )}
                    
                    {/* Avatar and info */}
                    <div className="relative">
                      {selectedConv.type === 'direct' ? (
                        (() => {
                          const otherUser = selectedConv.participants.find(p => p.id !== user.id)
                          return (
                            <>
                              {otherUser?.avatar_url ? (
                                <ImageWithFallback
                                  src={otherUser.avatar_url}
                                  alt={otherUser.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    {getInitials(otherUser?.name || 'U')}
                                  </span>
                                </div>
                              )}
                              {otherUser?.status === 'online' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                              )}
                            </>
                          )
                        })()
                      ) : (
                        <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {selectedConv.type === 'direct' 
                          ? selectedConv.participants.find(p => p.id !== user.id)?.name
                          : selectedConv.name
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {typingUsers.length > 0 
                          ? `${typingUsers.join(', ')} typing...`
                          : selectedConv.type === 'group' 
                            ? `${selectedConv.participant_count} members` 
                            : selectedConv.participants.find(p => p.id !== user.id)?.status === 'online' 
                              ? 'Online' 
                              : 'Offline'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Header actions */}
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-muted/50 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-muted/50 rounded-lg">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-muted/50 rounded-lg">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 message-interface">
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === user.id
                  const showAvatar = !isOwnMessage && (
                    index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id ||
                    new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000 // 5 minutes
                  )
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                        showAvatar ? 'mt-4' : 'mt-1'
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="flex-shrink-0 mr-3">
                          {showAvatar ? (
                            message.sender_avatar ? (
                              <ImageWithFallback
                                src={message.sender_avatar}
                                alt={message.sender_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {getInitials(message.sender_name)}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="w-8 h-8"></div>
                          )}
                        </div>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'message-bubble' : ''}`}>
                        {!isOwnMessage && showAvatar && (
                          <p className="text-xs text-muted-foreground mb-1 ml-1">
                            {message.sender_name}
                          </p>
                        )}
                        
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-card border border-border text-card-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          
                          {/* Message reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {message.reactions.map((reaction, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 bg-muted/50 rounded-full text-xs"
                                  title={reaction.users.join(', ')}
                                >
                                  {reaction.emoji} {reaction.count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <p className={`text-xs text-muted-foreground mt-1 ${
                          isOwnMessage ? 'text-right' : 'text-left'
                        }`}>
                          {formatMessageTime(message.created_at)}
                          {message.edited_at && ' (edited)'}
                        </p>
                      </div>
                    </div>
                  )
                })}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8"></div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className={`p-4 bg-card border-t border-border chat-input-mobile`}>
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <div className="flex items-end bg-input border border-border rounded-2xl">
                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground max-h-32"
                        rows={1}
                        style={{ minHeight: '44px' }}
                      />
                      
                      <div className="flex items-center space-x-2 px-3 py-3">
                        <button className="p-1 hover:bg-muted/50 rounded-lg">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="p-1 hover:bg-muted/50 rounded-lg">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="p-1 hover:bg-muted/50 rounded-lg">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-3 btn-gradient rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  >
                    {sendingMessage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-4">Choose a conversation from the sidebar to start messaging</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground">Start New Chat</h2>
                <button
                  onClick={() => {
                    setShowNewChatModal(false)
                    setUserSearchQuery('')
                    setSearchResults([])
                  }}
                  className="p-2 hover:bg-muted/50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* User search */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value)
                      searchUsers(e.target.value)
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>
            </div>
            
            {/* Search results */}
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => startNewConversation(profile.id)}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                    >
                      {profile.avatar_url ? (
                        <ImageWithFallback
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {getInitials(profile.name)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground truncate">{profile.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
                      </div>
                      
                      <div className={`w-3 h-3 rounded-full ${
                        profile.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                    </div>
                  ))}
                </div>
              ) : userSearchQuery.trim() ? (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Search for users to start a conversation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}