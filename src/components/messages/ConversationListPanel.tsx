import React, { useState } from 'react'
import { Search, Plus, X, MessageCircle } from 'lucide-react'
import { User } from '../../utils/auth'
import { ImageWithFallback } from '../figma/ImageWithFallback'

interface Conversation {
  id: string
  participants: string[]
  last_message?: {
    id: string
    content: string
    sender_id: string
    sender_name: string
    created_at: string
  } | null
  participant?: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface ConversationListPanelProps {
  conversations: Conversation[]
  selectedConversation: string | null
  currentUser: User
  unreadCounts: Record<string, number>
  showConversationList: boolean
  isMobile: boolean
  onSelectConversation: (conversationId: string) => void
  onNewChat: () => void
}

export function ConversationListPanel({
  conversations,
  selectedConversation,
  currentUser,
  unreadCounts,
  showConversationList,
  isMobile,
  onSelectConversation,
  onNewChat
}: ConversationListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredConversations = conversations.filter(conv => 
    !searchQuery || 
    conv.participant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`${
      isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'
    } flex-col w-full ${!isMobile ? 'max-w-sm' : ''} post-card border-r`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Messages</h2>
          <button
            onClick={onNewChat}
            className="p-2 hover:bg-secondary rounded-lg touch-target transition-colors"
            aria-label="New chat"
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary rounded touch-target"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewChat}
                className="btn-gradient px-4 py-2 rounded-lg"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const unreadCount = unreadCounts[conversation.id] || 0
            const isSelected = selectedConversation === conversation.id
            
            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`p-4 border-b cursor-pointer hover:bg-secondary transition-colors ${
                  isSelected ? 'bg-secondary' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar with unread badge */}
                  <div className="relative">
                    <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                      {conversation.participant?.avatar_url ? (
                        <ImageWithFallback
                          src={conversation.participant.avatar_url}
                          alt={conversation.participant.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-white">
                          {getInitials(conversation.participant?.name || 'Unknown')}
                        </span>
                      )}
                    </div>
                    
                    {/* Unread Count Badge */}
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium text-foreground truncate ${
                        unreadCount > 0 ? 'font-semibold' : ''
                      }`}>
                        {conversation.participant?.name || 'Unknown User'}
                      </h3>
                      {conversation.last_message && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatMessageTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {conversation.last_message ? (
                      <p className={`text-sm text-muted-foreground truncate ${
                        unreadCount > 0 ? 'font-medium' : ''
                      }`}>
                        {conversation.last_message.sender_id === currentUser.id ? 'You: ' : ''}
                        {conversation.last_message.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No messages yet</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
