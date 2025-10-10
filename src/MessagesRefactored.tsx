import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, MessageCircle } from 'lucide-react'
import { User } from '../utils/auth'
import { supabase } from '../utils/supabase/client'
import { projectId } from '../utils/supabase/info'
import { ConversationListPanel } from './messages/ConversationListPanel'
import { ChatWindow } from './messages/ChatWindow'
import { NewChatModal } from './messages/NewChatModal'

interface MessagesRefactoredProps {
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
  participants: string[]
  last_message?: Message | null
  participant?: {
    id: string
    name: string
    avatar_url?: string
  }
  messages?: Message[]
  unread_count?: number
}

export function MessagesRefactored({ 
  user, 
  onNavigate, 
  onUnreadCountChange, 
  targetUserId 
}: MessagesRefactoredProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [error, setError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  // Refs
  const messageChannelRef = useRef<any>(null)
  const conversationChannelRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const notificationChannelRef = useRef<any>(null)

 
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
    setupNotificationRealtimeSubscription()
    
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
            setRealtimeStatus('connected')
            console.log('✅ Conversation list realtime connected')
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('disconnected')
            console.error('❌ Conversation list realtime error')
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
                  *,
                  sender:user_profiles!messages_sender_id_fkey (
                    id,
                    name,
                    avatar_url
                  )
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
                  type: fullMessage.type || 'text'
                }
                
                // Add to messages if not already present
                setMessages(prev => {
                  if (prev.find(m => m.id === formattedMessage.id)) {
                    return prev
                  }
                  return [...prev, formattedMessage]
                })
                
                // Update conversation list (optimized - only update the specific conversation)
                updateConversationLastMessage(conversationId, formattedMessage)
              }
            } catch (error) {
              console.error('❌ Error handling new message:', error)
            }
          }
        )
        .subscribe()

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

  // Setup realtime subscription for notifications
  const setupNotificationRealtimeSubscription = () => {
    try {
      const channel = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any
            
            // If it's a message notification and not from the current conversation, increment unread
            if (newNotification.type === 'message' && newNotification.conversation_id) {
              if (newNotification.conversation_id !== selectedConversation) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [newNotification.conversation_id]: (prev[newNotification.conversation_id] || 0) + 1
                }))
              }
              
              // Show browser notification if supported
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/icon.png', // Add your app icon
                  tag: newNotification.conversation_id // Prevents duplicate notifications
                })
              }
            }
          }
        )
        .subscribe()

      notificationChannelRef.current = channel
    } catch (error) {
      console.error('❌ Error setting up notification subscription:', error)
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Cleanup subscriptions
  const cleanupSubscriptions = () => {
    cleanupMessageSubscription()
    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current)
      conversationChannelRef.current = null
    }
    if (notificationChannelRef.current) {
      supabase.removeChannel(notificationChannelRef.current)
      notificationChannelRef.current = null
    }
  }

  const cleanupMessageSubscription = () => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
      messageChannelRef.current = null
    }
  }

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!selectedConversation) return

    try {
      if (isTyping) {
        // Insert or update typing indicator
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: selectedConversation,
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
      } else {
        // Remove typing indicator
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', selectedConversation)
          .eq('user_id', user.id)
      }
    } catch (error) {
      console.error('❌ Error sending typing indicator:', error)
    }
  }, [selectedConversation, user.id])

  // Handle typing with debounce
  const handleTyping = useCallback((isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      sendTypingIndicator(true)
      
      // Auto-stop typing indicator after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false)
      }, 2000)
    } else {
      sendTypingIndicator(false)
    }
  }, [sendTypingIndicator])

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
        console.log('✅ Conversations loaded:', conversationsData.length)
        setConversations(conversationsData)
        
        // Calculate unread counts
        const unreadMap: Record<string, number> = {}
        conversationsData.forEach((conv: Conversation) => {
          unreadMap[conv.id] = conv.unread_count || 0
        })
        setUnreadCounts(unreadMap)
      } else if (response.status === 401) {
        console.error('❌ Unauthorized - invalid token')
        setError('Session expired. Please sign in again.')
      } else {
        console.error('❌ Failed to load conversations:', response.status)
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
        console.log('✅ Messages loaded for conversation:', conversationId)
        setMessages(conversation?.messages || [])
        
        // Mark as read by resetting unread count
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: 0
        }))
      } else {
        console.error('❌ Failed to load messages:', response.status)
        setError('Failed to load messages')
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      setError('Failed to load messages')
    }
  }

  // Start new conversation
  const startNewConversation = async (targetUserId: string) => {
    try {
      console.log('💬 Starting conversation with user:', targetUserId)
      
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
        console.log('✅ Conversation created/retrieved:', conversation.id)
        
        // Optimized: Only reload conversations if this is a new conversation
        const existingConv = conversations.find(c => c.id === conversation.id)
        if (!existingConv) {
          await loadConversations()
        }
        
        // Select the conversation
        setSelectedConversation(conversation.id)
        await loadMessages(conversation.id)
        
        // Close modal
        setShowNewChatModal(false)
        
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
    }
  }

  // Send message
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
        const { conversation } = await response.json()
        console.log('✅ Message sent successfully')
        
        // Update messages (realtime will handle this, but set it immediately for UX)
        setMessages(conversation?.messages || [])
        
        // Stop typing indicator
        handleTyping(false)
        
        // Don't reload entire conversation list - realtime will update it
      } else {
        console.error('❌ Failed to send message:', response.status)
        setError('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setError('Failed to send message. Please try again.')
    }
  }

  // Handle conversation selection
  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    await loadMessages(conversationId)
    
    // Mark conversation notifications as read
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/notifications/conversation/${conversationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('✅ Marked conversation notifications as read')
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error)
    }
    
    if (isMobile) {
      setShowConversationList(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : ''} message-interface`}>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <X className="h-4 w-4" />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-2 p-1 hover:bg-destructive/80 rounded touch-target"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {realtimeStatus !== 'connected' && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
            realtimeStatus === 'connecting' 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {realtimeStatus === 'connecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="text-sm capitalize">{realtimeStatus}</span>
          </div>
        </div>
      )}
      
      {/* Conversation List Panel */}
      <ConversationListPanel
        conversations={conversations}
        selectedConversation={selectedConversation}
        currentUser={user}
        unreadCounts={unreadCounts}
        showConversationList={showConversationList}
        isMobile={isMobile}
        onSelectConversation={handleConversationSelect}
        onNewChat={() => setShowNewChatModal(true)}
      />

      {/* Chat Window */}
      <ChatWindow
        conversation={conversations.find(c => c.id === selectedConversation) || null}
        messages={messages}
        currentUser={user}
        typingUsers={typingUsers}
        realtimeStatus={realtimeStatus}
        showConversationList={showConversationList}
        isMobile={isMobile}
        onSendMessage={sendMessage}
        onTyping={handleTyping}
        onBack={() => setShowConversationList(true)}
      />

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          currentUser={user}
          onClose={() => setShowNewChatModal(false)}
          onStartConversation={startNewConversation}
        />
      )}
    </div>
  )
}
