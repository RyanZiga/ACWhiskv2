import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, Image, Mic, X, Plus } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file') => void
  onTyping?: (isTyping: boolean) => void
  isMobile: boolean
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  onCancelReply?: () => void
}

export function MessageInput({ 
  onSendMessage,
  onTyping,
  isMobile, 
  replyTo, 
  onCancelReply 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '🍕', '🍔', '🍟', '🌮', '🍝', '🍜', '🍲', '🥘', '🍳', '🥓',
    '🥩', '🍗', '🥖', '🧀', '🥗', '🍅', '🥑', '🌶️', '🧄', '🧅'
  ]

  useEffect(() => {
    adjustTextareaHeight()
  }, [message])

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
      handleTypingStop()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value
    setMessage(newMessage)
    
    // Handle typing indicators
    if (newMessage.length > 0 && !isTyping) {
      handleTypingStart()
    } else if (newMessage.length === 0 && isTyping) {
      handleTypingStop()
    } else if (newMessage.length > 0) {
      // Reset typing timeout
      handleTypingStart()
    }
  }

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true)
      onTyping?.(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 2000) // Stop typing after 2 seconds of inactivity
  }

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false)
      onTyping?.(false)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji
    setMessage(newMessage)
    setShowEmojis(false)
    textareaRef.current?.focus()
    
    // Trigger typing indicator
    if (!isTyping) {
      handleTypingStart()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Handle file upload logic
      onSendMessage(`Sent a file: ${file.name}`, 'file')
      setShowAttachments(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Handle image upload logic
      onSendMessage(`Sent an image: ${file.name}`, 'image')
      setShowAttachments(false)
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      // Start recording
      console.log('Start recording')
    } else {
      // Stop recording and send
      console.log('Stop recording')
      onSendMessage('Voice message', 'file')
    }
  }

  // Handle clicks outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAttachments || showEmojis) {
        const target = event.target as Element
        if (!target.closest('.attachments-menu') && !target.closest('.emoji-picker')) {
          setShowAttachments(false)
          setShowEmojis(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAttachments, showEmojis])

  return (
    <div className="relative">
      {/* Reply Banner */}
      {replyTo && (
        <div className="px-4 py-3 bg-purple-50 border-t border-purple-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-700">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-sm text-purple-600 truncate">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-purple-600 hover:text-purple-700 transition-colors touch-target"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojis && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowEmojis(false)}
          />
          <div className="emoji-picker absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-xl shadow-xl z-50 p-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-xl touch-target"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Attachments Menu */}
      {showAttachments && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAttachments(false)}
          />
          <div className="attachments-menu absolute bottom-full left-4 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 min-w-48">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Image className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Photo</p>
                <p className="text-xs text-gray-500">Share an image</p>
              </div>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-3 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Paperclip className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">File</p>
                <p className="text-xs text-gray-500">Share a document</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Main Input Area */}
      <div className={`p-4 bg-white ${isMobile ? 'pb-safe' : ''}`}>
        <div className="flex items-end space-x-3">
          {/* Attachment Button */}
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 touch-target ${
              showAttachments ? 'bg-gray-100 text-gray-700' : ''
            }`}
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <div className="flex items-end bg-gray-100 rounded-2xl px-4 py-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                onBlur={handleTypingStop}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500 min-h-[40px] max-h-[120px]"
                rows={1}
              />
              
              {/* Emoji Button */}
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className={`p-1 text-gray-500 hover:text-gray-700 transition-colors ml-2 touch-target ${
                  showEmojis ? 'text-gray-700' : ''
                }`}
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Send/Voice Button */}
          {message.trim() ? (
            <button
              onClick={handleSend}
              className="p-3 bg-custom-gradient hover-custom-gradient text-white rounded-full transition-all duration-200 transform hover:scale-105 flex-shrink-0 touch-target"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full transition-all duration-200 transform hover:scale-105 flex-shrink-0 touch-target ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="mt-2 text-xs text-gray-500 px-4">
            Typing...
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}