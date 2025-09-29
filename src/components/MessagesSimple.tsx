import React, { useState, useEffect, useRef } from 'react'
import { 
  Search, Users, Phone, Video, MoreVertical, X, Eye, 
  UserPlus, UserCheck, ArrowLeft, Send, Plus, MessageCircle
} from 'lucide-react'
import { User } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface MessagesProps {
  user: User
  onNavigate: (page: string, id?: string) => void
  onUnreadCountChange?: (count: number) => void
}

interface SimpleMessage {
  id: string
  sender_id: string
  sender_name: string
  content: string
  timestamp: string
  isOwn: boolean
}

interface SimpleConversation {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  isOnline: boolean
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString()
  }
}

// Sample data for demonstration
const sampleConversations: SimpleConversation[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastMessage: 'Great work on your soufflé technique!',
    lastMessageTime: new Date(Date.now() - 300000).toISOString(),
    unreadCount: 2,
    isOnline: true
  },
  {
    id: '2',
    name: 'Mike Chen',
    lastMessage: 'Thanks for the recipe recommendations!',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
    isOnline: false
  },
  {
    id: '3',
    name: 'Baking Fundamentals',
    lastMessage: 'Don\'t forget about tomorrow\'s practical exam!',
    lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 1,
    isOnline: true
  }
]

const sampleMessages: Record<string, SimpleMessage[]> = {
  '1': [
    {
      id: '1',
      sender_id: '1',
      sender_name: 'Sarah Johnson',
      content: 'How did your practice session go today?',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      isOwn: false
    },
    {
      id: '2',
      sender_id: 'current',
      sender_name: 'You',
      content: 'Really well! I think I\'m getting the hang of the folding technique.',
      timestamp: new Date(Date.now() - 450000).toISOString(),
      isOwn: true
    },
    {
      id: '3',
      sender_id: '1',
      sender_name: 'Sarah Johnson',
      content: 'Great work on your soufflé technique!',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      isOwn: false
    }
  ],
  '2': [
    {
      id: '4',
      sender_id: 'current',
      sender_name: 'You',
      content: 'Do you have any recommendations for French pastry books?',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isOwn: true
    },
    {
      id: '5',
      sender_id: '2',
      sender_name: 'Mike Chen',
      content: 'Thanks for the recipe recommendations!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isOwn: false
    }
  ],
  '3': [
    {
      id: '6',
      sender_id: '1',
      sender_name: 'Sarah Johnson',
      content: 'Don\'t forget about tomorrow\'s practical exam!',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isOwn: false
    }
  ]
}

export function Messages({ user, onNavigate, onUnreadCountChange }: MessagesProps) {
  const [conversations, setConversations] = useState<SimpleConversation[]>(sampleConversations)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<SimpleMessage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    message: string
    sender: string
    timestamp: string
  }>>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      setMessages(sampleMessages[selectedConversation] || [])
      markAsRead(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    onUnreadCountChange?.(totalUnread)
  }, [conversations, onUnreadCountChange])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const markAsRead = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ))
  }

  const sendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return

    const newMsg: SimpleMessage = {
      id: `msg-${Date.now()}`,
      sender_id: 'current',
      sender_name: user.name,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isOwn: true
    }

    setMessages(prev => [...prev, newMsg])
    
    // Update conversation list
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation
        ? { 
            ...conv, 
            lastMessage: newMessage.trim(),
            lastMessageTime: new Date().toISOString()
          }
        : conv
    ))

    setNewMessage('')
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

  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  return (
    <div className="min-h-screen bg-theme-gradient relative">
      {/* Notification Banner */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm animate-slide-down"
            >
              <div className="flex items-start space-x-3">
                <MessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{notif.sender}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
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
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center space-x-2 px-3 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm touch-target"
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
                          {conversation.avatar ? (
                            <ImageWithFallback
                              src={conversation.avatar}
                              alt={conversation.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {getInitials(conversation.name)}
                              </span>
                            </div>
                          )}
                          {/* Online indicator */}
                          {conversation.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-medium truncate ${
                              conversation.unreadCount > 0 ? 'text-foreground' : 'text-card-foreground'
                            }`}>
                              {conversation.name}
                            </h3>
                            {conversation.lastMessageTime && (
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                {formatTime(conversation.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          
                          {conversation.lastMessage && (
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${
                                conversation.unreadCount > 0 
                                  ? 'text-foreground font-medium' 
                                  : 'text-muted-foreground'
                              }`}>
                                {conversation.lastMessage}
                              </p>
                              
                              {/* Unread badge */}
                              {conversation.unreadCount > 0 && (
                                <div className="ml-2 flex-shrink-0">
                                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
                                    {conversation.unreadCount}
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
                    className="px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm touch-target"
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
                        className="p-2 hover:bg-muted/50 rounded-lg touch-target"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    )}
                    
                    {/* Avatar and info */}
                    <div className="relative">
                      <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {getInitials(selectedConv.name)}
                        </span>
                      </div>
                      {selectedConv.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-card-foreground">{selectedConv.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConv.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Header actions */}
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-muted/50 rounded-lg touch-target">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-muted/50 rounded-lg touch-target">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-muted/50 rounded-lg touch-target">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 message-interface">
                {messages.map((message, index) => {
                  const showAvatar = !message.isOwn && (
                    index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id ||
                    new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000
                  )
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} ${
                        showAvatar ? 'mt-4' : 'mt-1'
                      }`}
                    >
                      {!message.isOwn && (
                        <div className="flex-shrink-0 mr-3">
                          {showAvatar ? (
                            <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {getInitials(message.sender_name)}
                              </span>
                            </div>
                          ) : (
                            <div className="w-8 h-8"></div>
                          )}
                        </div>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${message.isOwn ? 'message-bubble' : ''}`}>
                        {!message.isOwn && showAvatar && (
                          <p className="text-xs text-muted-foreground mb-1 ml-1">
                            {message.sender_name}
                          </p>
                        )}
                        
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.isOwn
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-card border border-border text-card-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        
                        <p className={`text-xs text-muted-foreground mt-1 ${
                          message.isOwn ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-card border-t border-border chat-input-mobile">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <div className="flex items-end bg-input border border-border rounded-2xl">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground max-h-32"
                        rows={1}
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 btn-gradient rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  >
                    <Send className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-4">Choose a conversation from the sidebar to start messaging</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors touch-target"
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
          <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden modal-responsive">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">Start New Chat</h2>
                <button
                  onClick={() => {
                    setShowNewChatModal(false)
                    setUserSearchQuery('')
                  }}
                  className="p-2 hover:bg-muted/50 rounded-lg touch-target"
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
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
              </div>
            </div>
            
            {/* Search help */}
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">This is a demo interface</p>
              <p className="text-sm text-muted-foreground">
                Run the database setup SQL to enable full messaging functionality
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}