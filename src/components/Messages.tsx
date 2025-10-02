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

export function Messages({ user, onNavigate, onUnreadCountChange, targetUserId }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [])

  // Handle direct messaging when targetUserId is provided
  useEffect(() => {
    if (targetUserId) {
      console.log('Starting conversation with target user:', targetUserId)
      startNewConversation(targetUserId)
    }
  }, [targetUserId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
      markConversationAsRead(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      setError(null)
      const supabase = getAuthenticatedClient()
      
      // Get conversations for the current user
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          name,
          description,
          avatar_url,
          created_at,
          updated_at,
          conversation_participants!inner (
            user_id,
            last_read_at
          )
        `)
        .eq('conversation_participants.user_id', user.id)
        .is('conversation_participants.left_at', null)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (conversationsError) {
        console.error('Error loading conversations:', conversationsError)
        setError('Failed to load conversations')
        setConversations([])
        return
      }

      // Transform the data to match our interface
      const transformedConversations: Conversation[] = await Promise.all(
        (conversationsData || []).map(async (conv: any) => {
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
              .eq('conversation_id', conv.id)
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
              .eq('conversation_id', conv.id)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              id: conv.id,
              type: conv.type,
              name: conv.name,
              description: conv.description,
              avatar_url: conv.avatar_url,
              participants: participantProfiles,
              last_message: lastMessage ? {
                content: lastMessage.content,
                sender_id: lastMessage.sender_id,
                sender_name: lastMessage.user_profiles?.name || 'Unknown User',
                created_at: lastMessage.created_at
              } : undefined,
              unread_count: 0, // Will be calculated separately if needed
              participant_count: participantProfiles.length,
              created_at: conv.created_at,
              updated_at: conv.updated_at
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
      setError('Failed to load conversations')
      setConversations([])
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
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          file_url,
          file_name,
          reply_to_id,
          created_at,
          edited_at,
          user_profiles!sender_id (
            id,
            name,
            avatar_url
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
        sender_name: msg.user_profiles?.name || 'Unknown User',
        sender_avatar: msg.user_profiles?.avatar_url,
        content: msg.content,
        message_type: msg.message_type,
        file_url: msg.file_url,
        file_name: msg.file_name,
        reply_to_id: msg.reply_to_id,
        created_at: msg.created_at,
        edited_at: msg.edited_at
      }))

      setMessages(transformedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }
  }

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const supabase = getAuthenticatedClient()
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
      
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
      setSearchingUsers(false)
      return
    }

    setSearchingUsers(true)

    try {
      const supabase = getAuthenticatedClient()
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, avatar_url, status, role')
        .ilike('name', `%${query}%`)
        .neq('id', user.id)
        .limit(20)

      if (!error && data) {
        const searchResultsData = data.map(u => ({
          ...u,
          status: (u.status || 'offline') as 'online' | 'offline' | 'away'
        }))
        
        setSearchResults(searchResultsData)
        console.log(`Found ${searchResultsData.length} users matching "${query}"`)
      } else {
        console.error('Database search error:', error)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  const debouncedSearchUsers = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query)
    }, 300)
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
      } else {
        console.error('Error creating conversation:', error)
        setError('Failed to start conversation')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      setError('Failed to start conversation')
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

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
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          created_at,
          user_profiles!sender_id (
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
          sender_name: data.user_profiles?.name || user.name,
          sender_avatar: data.user_profiles?.avatar_url,
          content: data.content,
          message_type: data.message_type,
          created_at: data.created_at
        }

        setMessages(prev => [...prev, newMsg])
        loadConversations() // Refresh to update last message
      } else {
        console.error('Error sending message:', error)
        setNewMessage(messageContent) // Restore message on error
        setError('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
      setError('Failed to send message')
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

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat'
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== user.id)
    return otherParticipant?.name || 'Unknown User'
  }

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.avatar_url
    }
    
    // For direct messages, show the other participant's avatar
    const otherParticipant = conversation.participants.find(p => p.id !== user.id)
    return otherParticipant?.avatar_url
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null)
              loadConversations()
            }}
            className="btn-gradient px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : ''}`}>
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
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean w-full pl-10 pr-4 py-2"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
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
            conversations
              .filter(conv => 
                !searchQuery || 
                getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation.id)
                    if (isMobile) setShowConversationList(false)
                  }}
                  className={`p-4 border-b cursor-pointer hover:bg-secondary transition-colors ${
                    selectedConversation === conversation.id ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                      {getConversationAvatar(conversation) ? (
                        <ImageWithFallback
                          src={getConversationAvatar(conversation)!}
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
                    
                    {conversation.unread_count > 0 && (
                      <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              ))
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
                
                {selectedConversation && (
                  (() => {
                    const conversation = conversations.find(c => c.id === selectedConversation)
                    if (!conversation) return null
                    
                    return (
                      <>
                        <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                          {getConversationAvatar(conversation) ? (
                            <ImageWithFallback
                              src={getConversationAvatar(conversation)!}
                              alt={getConversationName(conversation)}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-white">
                              {getInitials(getConversationName(conversation))}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {getConversationName(conversation)}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {conversation.participant_count} participants
                          </p>
                        </div>
                      </>
                    )
                  })()
                )}
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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-[70%] ${
                    message.sender_id === user.id ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {message.sender_id !== user.id && (
                      <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center">
                        {message.sender_avatar ? (
                          <ImageWithFallback
                            src={message.sender_avatar}
                            alt={message.sender_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-white">
                            {getInitials(message.sender_name)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className={`p-3 rounded-2xl ${
                      message.sender_id === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user.id
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t post-card">
              <div className="flex items-end space-x-2">
                <button className="p-2 hover:bg-secondary rounded-lg">
                  <Paperclip className="h-5 w-5" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="input-clean w-full resize-none min-h-[44px] max-h-32 pr-12"
                  />
                  <button className="absolute right-2 top-2 p-1 hover:bg-secondary rounded-lg">
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="btn-gradient p-2 rounded-lg disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="post-card rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">New Message</h3>
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
                    setUserSearchQuery(e.target.value)
                    debouncedSearchUsers(e.target.value)
                  }}
                  className="input-clean w-full pl-10 pr-4 py-2"
                  autoFocus
                />
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
                      onClick={() => startNewConversation(userProfile.id)}
                      className="flex items-center space-x-3 p-3 hover:bg-secondary rounded-lg cursor-pointer"
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