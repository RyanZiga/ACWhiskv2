import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, MessageCircle, Loader2 } from 'lucide-react'
import { User } from '../../utils/auth'
import { ImageWithFallback } from '../figma/ImageWithFallback'

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
}

interface Conversation {
  id: string
  participant?: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface ChatWindowProps {
  conversation: Conversation | null
  messages: Message[]
  currentUser: User
  typingUsers: string[]
  realtimeStatus: 'connected' | 'connecting' | 'disconnected'
  showConversationList: boolean
  isMobile: boolean
  onSendMessage: (content: string) => void
  onTyping: (isTyping: boolean) => void
  onBack: () => void
}

export function ChatWindow({
  conversation,
  messages,
  currentUser,
  typingUsers,
  realtimeStatus,
  showConversationList,
  isMobile,
  onSendMessage,
  onTyping,
  onBack
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)


  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

  const handleMessageChange = (value: string) => {
    setNewMessage(value)
    

    if (value.length > 0) {
      onTyping(true)
      

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    } else {
      onTyping(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    const messageContent = newMessage.trim()
    setNewMessage('')
    
    try {
      await onSendMessage(messageContent)
    } catch (error) {
      console.error('Failed to send message:', error)
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!conversation) {
    return (
      <div className={`${
        isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'
      } flex-col flex-1 items-center justify-center`}>
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p className="text-muted-foreground mb-6">
            Choose a conversation from the sidebar to start messaging
          </p>
          {isMobile && (
            <button
              onClick={onBack}
              className="btn-gradient px-4 py-2 rounded-lg"
            >
              View Conversations
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${
      isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'
    } flex-col flex-1`}>
      {/* Chat Header */}
      <div className="p-4 border-b post-card flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isMobile && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-secondary rounded-lg mr-2 touch-target transition-colors"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
            {conversation.participant?.avatar_url ? (
              <ImageWithFallback
                src={conversation.participant.avatar_url}
                alt={conversation.participant.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-white">
                {getInitials(conversation.participant?.name || 'Unknown')}
              </span>
            )}
          </div>
          
          <div>
            <h3 className="font-medium">
              {conversation.participant?.name || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                {typingUsers.length > 0 ? (
                  <span className="text-primary animate-pulse">
                    typing...
                  </span>
                ) : (
                  'Last seen recently'
                )}
              </p>
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-400' : 'bg-gray-400'
              }`} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="Voice call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button 
            className="p-2 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="Video call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button 
            className="p-2 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser.id
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t post-card chat-input-mobile">
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="Attach file"
          >
            <Smile className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendingMessage}
              className="input-clean w-full px-4 py-2 pr-12"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="btn-gradient p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed touch-target transition-all"
            aria-label="Send message"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
