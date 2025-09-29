import React from 'react'
import { Users, CheckCheck, Check } from 'lucide-react'
import { formatTimestamp, getInitials } from './helpers'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor' | 'admin'
}

interface Conversation {
  id: string
  participants: Array<{
    id: string
    name: string
    avatar?: string
    online?: boolean
  }>
  lastMessage: {
    content: string
    timestamp: Date
    senderId: string
  }
  unreadCount: number
  type: 'direct' | 'group'
  groupName?: string
  isPinned?: boolean
  isMuted?: boolean
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: string | null
  currentUser: User
  onSelectConversation: (conversationId: string) => void
  isMobile: boolean
}

export function ConversationList({
  conversations,
  selectedConversation,
  currentUser,
  onSelectConversation,
  isMobile
}: ConversationListProps) {
  const formatLastMessage = (conversation: Conversation) => {
    const { lastMessage } = conversation
    const isOwnMessage = lastMessage.senderId === currentUser.id
    const senderName = isOwnMessage ? 'You' : 
      conversation.participants.find(p => p.id === lastMessage.senderId)?.name || 'Unknown'
    
    const prefix = conversation.type === 'group' && !isOwnMessage ? `${senderName}: ` : ''
    const content = lastMessage.content.length > 40 
      ? lastMessage.content.substring(0, 40) + '...' 
      : lastMessage.content
    
    return `${prefix}${content}`
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`
    
    return messageDate.toLocaleDateString()
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    // Pinned conversations first
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    
    // Then by last message timestamp
    return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
  })

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-sm text-gray-600">Start a conversation to connect with others!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedConversations.map((conversation) => {
        const isSelected = selectedConversation === conversation.id
        const otherParticipant = conversation.type === 'direct' 
          ? conversation.participants.find(p => p.id !== currentUser.id)
          : null
        
        const displayName = conversation.type === 'direct'
          ? otherParticipant?.name || 'Unknown'
          : conversation.groupName || 'Group Chat'

        const isOnline = conversation.type === 'direct' && otherParticipant?.online

        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              relative cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0
              ${isSelected 
                ? 'bg-purple-50 border-purple-200' 
                : 'hover:bg-gray-50 active:bg-gray-100'
              }
              ${isMobile ? 'p-4' : 'p-4'}
            `}
          >
            {/* Pinned Indicator */}
            {conversation.isPinned && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-purple-600 rounded-full"></div>
            )}

            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conversation.type === 'direct' ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {getInitials(displayName)}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                )}
                
                {/* Online Status */}
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                )}

                {/* Unread Count Badge */}
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-medium truncate ${
                    conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'
                  }`}>
                    {displayName}
                  </h3>
                  
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    {/* Message Status (for own messages) */}
                    {conversation.lastMessage.senderId === currentUser.id && (
                      <div className="text-gray-400">
                        {/* Assuming message is delivered for demo */}
                        <CheckCheck className="h-3 w-3" />
                      </div>
                    )}
                    
                    {/* Muted Indicator */}
                    {conversation.isMuted && (
                      <div className="text-gray-400">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.787L4.662 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.662l3.721-3.787zm5.324 9.797a.75.75 0 001.061-1.061L14.707 10l1.061-1.061a.75.75 0 10-1.061-1.061L13.646 8.94l-1.061-1.061a.75.75 0 00-1.061 1.061L12.585 10l-1.061 1.061a.75.75 0 001.061 1.061L13.646 11.06l1.061 1.061z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessage.timestamp)}
                    </span>
                  </div>
                </div>
                
                <p className={`text-sm truncate leading-relaxed ${
                  conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-600'
                }`}>
                  {formatLastMessage(conversation)}
                </p>

                {/* Additional Info for Group Chats */}
                {conversation.type === 'group' && (
                  <div className="flex items-center mt-1">
                    <Users className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">
                      {conversation.participants.length} members
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-600 rounded-l"></div>
            )}
          </div>
        )
      })}
    </div>
  )
}