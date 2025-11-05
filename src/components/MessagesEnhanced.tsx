import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, MessageCircle, Users, Mail, Check, XCircle, UserPlus } from 'lucide-react'
import { User } from '../utils/auth'
import { supabase } from '../utils/supabase/client'
import { projectId } from '../utils/supabase/info'
import { ChatWindow } from './messages/ChatWindow'
import { NewChatModal } from './messages/NewChatModal'
import { CreateGroupChatModal } from './messages/CreateGroupChatModal'

interface MessagesEnhancedProps {
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
  type?: 'text' | 'image' | 'file'
}

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  participants: string[]
  last_message?: Message | null
  participant?: {
    id: string
    name: string
    avatar_url?: string
  }
  messages?: Message[]
  unread_count?: number
  request_status?: 'pending' | 'accepted' | 'declined' | null
  requested_by?: string
  participant_count?: number
}

type TabType = 'direct' | 'requests' | 'groups'

export function MessagesEnhanced({ 
  user, 
  onNavigate, 
  onUnreadCountChange, 
  targetUserId 
}: MessagesEnhancedProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showGroupChatModal, setShowGroupChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('direct')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  
  // Refs
  const messageChannelRef = useRef<any>(null)
  const conversationChannelRef = useRef<any>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Initial load and setup realtime
  useEffect(() => {
    loadConversations()
    setupConversationRealtimeSubscription()
    
    return () => {
      cleanupSubscriptions()
    }
  }, [])

  // Handle target user (start conversation with specific user)
  useEffect(() => {
    if (targetUserId && conversations.length > 0) {
      startNewConversation(targetUserId)
    }
  }, [targetUserId, conversations.length])

  // Setup realtime for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      setupMessageRealtimeSubscription(selectedConversation)
    } else {
      cleanupMessageSubscription()
    }
    
    return () => {
      cleanupMessageSubscription()
    }
  }, [selectedConversation])

  // Update total unread count
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
    onUnreadCountChange?.(totalUnread)
  }, [unreadCounts, onUnreadCountChange])

  // Setup realtime subscription for conversation list
  const setupConversationRealtimeSubscription = () => {
    try {
      setRealtimeStatus('connecting')
      const channel = supabase
        .channel('conversations-list')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
          },
          () => {
            // Reload conversations when any conversation changes
            loadConversations()
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Conversation list realtime connected')
            setRealtimeStatus('connected')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Conversation list realtime error')
            setRealtimeStatus('disconnected')
          }
        })

      conversationChannelRef.current = channel
    } catch (error) {
      console.error('❌ Error setting up conversation subscription:', error)
      setRealtimeStatus('disconnected')
    }
  }

  // Setup realtime subscription for messages in a conversation
  const setupMessageRealtimeSubscription = (conversationId: string) => {
    try {
      // Clean up existing subscription
      cleanupMessageSubscription()

      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            try {
              const newMessage = payload.new as any
              
              // Fetch complete message data with sender info
              const { data: fullMessage, error } = await supabase
                .from('messages')
                .select(`
                  id,
                  content,
                  sender_id,
                  conversation_id,
                  created_at,
                  message_type,
                  sender:user_profiles(id, name, avatar_url)
                `)
                .eq('id', newMessage.id)
                .single()

              if (!error && fullMessage) {
                const formattedMessage: Message = {
                  id: fullMessage.id,
                  content: fullMessage.content,
                  sender_id: fullMessage.sender_id,
                  sender_name: fullMessage.sender?.name || 'Unknown',
                  created_at: fullMessage.created_at,
                  type: (fullMessage.message_type || 'text') as 'text' | 'image' | 'file'
                }
                
                // Add to messages if not already present
                setMessages(prev => {
                  if (prev.find(m => m.id === formattedMessage.id)) {
                    return prev
                  }
                  return [...prev, formattedMessage]
                })
                
                // Update conversation list
                updateConversationLastMessage(conversationId, formattedMessage)
              }
            } catch (error) {
              console.error('❌ Error handling new message:', error)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Message realtime subscription active for:', conversationId)
          }
        })

      messageChannelRef.current = channel
    } catch (error) {
      console.error('❌ Error setting up message subscription:', error)
    }
  }

  // Update a specific conversation's last message without reloading all conversations
  const updateConversationLastMessage = (conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          last_message: message
        }
      }
      return conv
    }))
  }

  // Cleanup subscriptions
  const cleanupSubscriptions = () => {
    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current)
    }
    cleanupMessageSubscription()
  }

  const cleanupMessageSubscription = () => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
    }
  }

  // Load conversations
  const loadConversations = async () => {
    try {
      if (!user?.access_token) {
        setLoading(false)
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const responseData = await response.json()
        const conversationsData = responseData?.conversations || []
        setConversations(conversationsData)
        
        // Calculate unread counts
        const unreadMap: Record<string, number> = {}
        conversationsData.forEach((conv: Conversation) => {
          unreadMap[conv.id] = conv.unread_count || 0
        })
        setUnreadCounts(unreadMap)
      } else if (response.status === 401) {
        setError('Session expired. Please sign in again.')
      } else {
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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const { conversation } = await response.json()
        setMessages(conversation?.messages || [])
        
        // Mark as read
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: 0
        }))
      } else {
        setError('Failed to load messages')
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      setError('Failed to load messages')
    }
  }

  // Send a message
  const sendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations/${selectedConversation}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: content.trim()
          })
        }
      )

      if (response.ok) {
        const { message } = await response.json()
        // Message will be added via realtime subscription
      } else {
        setError('Failed to send message')
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setError('Failed to send message')
    }
  }

  // Start new conversation
  const startNewConversation = async (targetUserId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            participant_id: targetUserId
          })
        }
      )

      if (response.ok) {
        const { conversation } = await response.json()
        
        const existingConv = conversations.find(c => c.id === conversation.id)
        if (!existingConv) {
          await loadConversations()
        }
        
        setSelectedConversation(conversation.id)
        await loadMessages(conversation.id)
        setShowConversationList(false)
      } else {
        setError('Failed to start conversation')
      }
    } catch (error) {
      console.error('❌ Error starting conversation:', error)
      setError('Failed to start conversation')
    }
  }

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId)
    loadMessages(conversationId)
    if (isMobile) {
      setShowConversationList(false)
    }
  }

  // Handle accept message request
  const handleAcceptRequest = async (conversationId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/message-requests/${conversationId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        // Reload conversations to update status
        await loadConversations()
        // Switch to direct chats tab and open conversation
        setActiveTab('direct')
        handleSelectConversation(conversationId)
      } else {
        setError('Failed to accept message request')
      }
    } catch (error) {
      console.error('❌ Error accepting request:', error)
      setError('Failed to accept message request')
    }
  }

  // Handle decline message request
  const handleDeclineRequest = async (conversationId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/message-requests/${conversationId}/decline`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        // Remove from list
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        if (selectedConversation === conversationId) {
          setSelectedConversation(null)
        }
      } else {
        setError('Failed to decline message request')
      }
    } catch (error) {
      console.error('❌ Error declining request:', error)
      setError('Failed to decline message request')
    }
  }

  // Filter conversations by tab
  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'direct') {
      return conv.type === 'direct' && (!conv.request_status || conv.request_status === 'accepted')
    } else if (activeTab === 'requests') {
      return conv.type === 'direct' && conv.request_status === 'pending' && conv.requested_by !== user.id
    } else if (activeTab === 'groups') {
      return conv.type === 'group'
    }
    return false
  })

  // Count unread for each tab
  const directUnread = conversations
    .filter(c => c.type === 'direct' && (!c.request_status || c.request_status === 'accepted'))
    .reduce((sum, c) => sum + (c.unread_count || 0), 0)

  const requestsUnread = conversations
    .filter(c => c.type === 'direct' && c.request_status === 'pending' && c.requested_by !== user.id)
    .reduce((sum, c) => sum + (c.unread_count || 0), 0)

  const groupsUnread = conversations
    .filter(c => c.type === 'group')
    .reduce((sum, c) => sum + (c.unread_count || 0), 0)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background">
      {/* Conversation List */}
      <div className={`${showConversationList || !isMobile ? 'flex' : 'hidden'} w-full lg:w-96 flex-col border-r border-border bg-card`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            <div className="flex gap-2">
              {(user.role === 'instructor' || user.role === 'admin') && (
                <button
                  onClick={() => setShowGroupChatModal(true)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  title="Create Group Chat"
                >
                  <Users className="w-5 h-5 text-foreground" />
                </button>
              )}
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="New Chat"
              >
                <UserPlus className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-accent/20 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-all ${
                activeTab === 'direct'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Chats</span>
                {directUnread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {directUnread}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-all ${
                activeTab === 'requests'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Requests</span>
                {requestsUnread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {requestsUnread}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-all ${
                activeTab === 'groups'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>Groups</span>
                {groupsUnread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {groupsUnread}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                {activeTab === 'direct' && <MessageCircle className="w-8 h-8 text-muted-foreground" />}
                {activeTab === 'requests' && <Mail className="w-8 h-8 text-muted-foreground" />}
                {activeTab === 'groups' && <Users className="w-8 h-8 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {activeTab === 'direct' && 'No conversations yet'}
                {activeTab === 'requests' && 'No message requests'}
                {activeTab === 'groups' && 'No group chats yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'direct' && 'Start a new chat to get started'}
                {activeTab === 'requests' && 'Message requests will appear here'}
                {activeTab === 'groups' && user.role === 'instructor' ? 'Create a group chat to get started' : 'Group chats will appear here'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => activeTab !== 'requests' && handleSelectConversation(conv.id)}
                className={`p-4 border-b border-border ${activeTab !== 'requests' ? 'cursor-pointer hover:bg-accent/50' : ''} transition-colors ${
                  selectedConversation === conv.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                      {conv.type === 'group' ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        conv.participant?.name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    {(conv.unread_count || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {conv.type === 'group' ? conv.name : conv.participant?.name}
                      </h3>
                      {conv.last_message && (
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {conv.type === 'group' && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {conv.participant_count} members
                      </p>
                    )}
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message.sender_name}: {conv.last_message.content}
                      </p>
                    )}
                    {!conv.last_message && activeTab === 'requests' && (
                      <p className="text-sm text-muted-foreground italic">New message request</p>
                    )}

                    {/* Request Actions */}
                    {activeTab === 'requests' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcceptRequest(conv.id)
                          }}
                          className="flex-1 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeclineRequest(conv.id)
                          }}
                          className="flex-1 py-2 px-3 bg-destructive text-destructive-foreground rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${!showConversationList || !isMobile ? 'flex' : 'hidden'} flex-1 flex flex-col`}>
        {selectedConversation ? (
          <ChatWindow
            conversation={conversations.find(c => c.id === selectedConversation) || null}
            messages={messages}
            currentUser={user}
            typingUsers={typingUsers}
            realtimeStatus={realtimeStatus}
            showConversationList={showConversationList}
            isMobile={isMobile}
            onSendMessage={(content) => sendMessage(content)}
            onTyping={(isTyping) => {
              // Handle typing indicator
              console.log('User typing:', isTyping)
            }}
            onBack={() => {
              setSelectedConversation(null)
              setShowConversationList(true)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No conversation selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a conversation from the list or start a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewChatModal && (
        <NewChatModal
          user={user}
          onClose={() => setShowNewChatModal(false)}
          onSelectUser={(userId) => {
            setShowNewChatModal(false)
            startNewConversation(userId)
          }}
        />
      )}

      {showGroupChatModal && (
        <CreateGroupChatModal
          user={user}
          onClose={() => setShowGroupChatModal(false)}
          onGroupCreated={(conversationId) => {
            setShowGroupChatModal(false)
            loadConversations().then(() => {
              setActiveTab('groups')
              handleSelectConversation(conversationId)
            })
          }}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <XCircle className="w-5 h-5" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
