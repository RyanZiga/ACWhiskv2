import React, { useEffect, useRef, useState } from 'react'
import { MoreVertical, Reply, Heart, Copy, Trash2, Edit, Check, X } from 'lucide-react'
import { formatTimestamp, getInitials } from './helpers'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor' | 'admin'
}

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  type: 'text' | 'image' | 'file'
  reactions?: Array<{
    emoji: string
    userIds: string[]
  }>
  edited?: boolean
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
}

interface Conversation {
  id: string
  participants: Array<{
    id: string
    name: string
    avatar?: string
    online?: boolean
  }>
  type: 'direct' | 'group'
  groupName?: string
}

interface MessageThreadProps {
  messages: Message[]
  currentUser: User
  conversation: Conversation
  isMobile: boolean
  onReplyToMessage?: (message: Message) => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
}

export function MessageThread({ 
  messages, 
  currentUser, 
  conversation, 
  isMobile,
  onReplyToMessage,
  onEditMessage,
  onDeleteMessage
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMessageLongPress = (messageId: string) => {
    if (isMobile) {
      const timer = setTimeout(() => {
        setSelectedMessage(messageId)
      }, 500)
      setLongPressTimer(timer)
    }
  }

  const handleMessageTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleMessageClick = (messageId: string) => {
    if (!isMobile) {
      setSelectedMessage(selectedMessage === messageId ? null : messageId)
    }
  }

  const handleEditStart = (message: Message) => {
    setEditingMessage(message.id)
    setEditContent(message.content)
    setSelectedMessage(null)
  }

  const handleEditSave = () => {
    if (editingMessage && editContent.trim() && onEditMessage) {
      onEditMessage(editingMessage, editContent.trim())
    }
    setEditingMessage(null)
    setEditContent('')
  }

  const handleEditCancel = () => {
    setEditingMessage(null)
    setEditContent('')
  }

  const handleReaction = (messageId: string, emoji: string) => {
    // Handle reaction logic here
    console.log('Add reaction:', emoji, 'to message:', messageId)
    setSelectedMessage(null)
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    setSelectedMessage(null)
  }

  const getSenderName = (senderId: string) => {
    if (senderId === currentUser.id) return 'You'
    const participant = conversation.participants.find(p => p.id === senderId)
    return participant?.name || 'Unknown'
  }

  const isOwnMessage = (senderId: string) => senderId === currentUser.id

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 relative">
      {/* Messages Container */}
      <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4`}>
        {messages.map((message, index) => {
          const isOwn = isOwnMessage(message.senderId)
          const senderName = getSenderName(message.senderId)
          const showAvatar = !isOwn && (
            index === 0 || 
            messages[index - 1].senderId !== message.senderId ||
            new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 5 * 60 * 1000
          )
          const showTimestamp = index === 0 || 
            new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 5 * 60 * 1000

          return (
            <div key={message.id} className="relative">
              {/* Timestamp Divider */}
              {showTimestamp && (
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 border border-gray-200">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className={`flex items-end space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {/* Avatar for other users */}
                {!isOwn && (
                  <div className={`flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {getInitials(senderName)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative max-w-xs lg:max-w-md ${
                    isMobile ? 'max-w-[75%]' : ''
                  }`}
                  onTouchStart={() => isMobile && handleMessageLongPress(message.id)}
                  onTouchEnd={handleMessageTouchEnd}
                  onClick={() => handleMessageClick(message.id)}
                >
                  {/* Reply Reference */}
                  {message.replyTo && (
                    <div className={`mb-2 px-3 py-2 rounded-lg border-l-4 ${
                      isOwn 
                        ? 'bg-purple-50 border-purple-400' 
                        : 'bg-gray-100 border-gray-400'
                    }`}>
                      <p className="text-xs text-gray-600 font-medium mb-1">
                        Replying to {message.replyTo.senderName}
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        {message.replyTo.content}
                      </p>
                    </div>
                  )}

                  {/* Sender Name (for group chats) */}
                  {!isOwn && conversation.type === 'group' && showAvatar && (
                    <p className="text-xs text-gray-600 mb-1 px-1">{senderName}</p>
                  )}

                  {/* Message Content */}
                  <div
                    className={`px-4 py-3 rounded-2xl relative group cursor-pointer ${
                      isOwn
                        ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    } ${
                      editingMessage === message.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    {editingMessage === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg resize-none text-gray-900 text-sm"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={handleEditCancel}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleEditSave}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        
                        {/* Message Status */}
                        <div className={`flex items-center justify-between mt-2 ${
                          isOwn ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {message.edited && (
                            <span className="text-xs italic">edited</span>
                          )}
                        </div>

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            {message.reactions.map((reaction, idx) => (
                              <div
                                key={idx}
                                className="flex items-center space-x-1 bg-white bg-opacity-20 rounded-full px-2 py-1"
                              >
                                <span className="text-xs">{reaction.emoji}</span>
                                <span className="text-xs">{reaction.userIds.length}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Quick Actions (Desktop Hover) */}
                    {!isMobile && selectedMessage !== message.id && (
                      <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center space-x-1 bg-white rounded-full shadow-lg border border-gray-200 p-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReaction(message.id, '👍')
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <span className="text-sm">👍</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReaction(message.id, '❤️')
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <span className="text-sm">❤️</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onReplyToMessage?.(message)
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Reply className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Actions Menu */}
              {selectedMessage === message.id && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSelectedMessage(null)}
                  />
                  
                  {/* Actions Menu */}
                  <div className={`absolute z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-2 ${
                    isMobile ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-2' : 'top-0 right-0 mt-8'
                  }`}>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          onReplyToMessage?.(message)
                          setSelectedMessage(null)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Reply className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Reply</span>
                      </button>
                      
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Copy className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Copy</span>
                      </button>

                      {/* Quick Reactions */}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex items-center space-x-2 px-3">
                          {['👍', '❤️', '😂', '😮', '😢', '🎉'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <span className="text-lg">{emoji}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Own Message Actions */}
                      {isOwn && (
                        <>
                          <div className="border-t border-gray-200 pt-1 mt-1"></div>
                          <button
                            onClick={() => handleEditStart(message)}
                            className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700">Edit</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              onDeleteMessage?.(message.id)
                              setSelectedMessage(null)
                            }}
                            className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700">Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {messages.length > 10 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-6 w-10 h-10 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}