export const formatTimestamp = (timestamp: Date): string => {
  const now = new Date()
  const messageDate = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return messageDate.toLocaleDateString()
}

export const getInitials = (name: string): string => {
  if (!name) return '?'
  
  const words = name.trim().split(' ')
  if (words.length === 0) return '?'
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

export const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  })
}

export const formatMessageDate = (timestamp: Date): string => {
  const messageDate = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (messageDate.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else if (messageDate.getFullYear() === today.getFullYear()) {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } else {
    return messageDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

export const isMessageFromToday = (timestamp: Date): boolean => {
  const messageDate = new Date(timestamp)
  const today = new Date()
  return messageDate.toDateString() === today.toDateString()
}

export const groupMessagesByDate = (messages: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {}
  
  messages.forEach(message => {
    const dateKey = formatMessageDate(message.timestamp)
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(message)
  })
  
  return grouped
}

export const shouldShowTimestamp = (
  currentMessage: any, 
  previousMessage: any, 
  threshold: number = 5 * 60 * 1000 // 5 minutes in milliseconds
): boolean => {
  if (!previousMessage) return true
  
  const currentTime = new Date(currentMessage.timestamp).getTime()
  const previousTime = new Date(previousMessage.timestamp).getTime()
  
  return currentTime - previousTime > threshold
}

export const shouldShowAvatar = (
  currentMessage: any,
  previousMessage: any,
  nextMessage: any
): boolean => {
  // Always show avatar if it's the first message
  if (!previousMessage) return true
  
  // Show avatar if sender changed
  if (previousMessage.senderId !== currentMessage.senderId) return true
  
  // Show avatar if next message is from different sender or doesn't exist
  if (!nextMessage || nextMessage.senderId !== currentMessage.senderId) return true
  
  // Show avatar if there's a significant time gap
  return shouldShowTimestamp(currentMessage, previousMessage)
}

export const truncateMessage = (message: string, maxLength: number = 50): string => {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

export const sanitizeMessage = (message: string): string => {
  // Basic sanitization - remove potential XSS vectors
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export const parseMessageForLinks = (message: string): { text: string; links: string[] } => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const links = message.match(urlRegex) || []
  const text = message.replace(urlRegex, '[LINK]')
  
  return { text, links }
}

export const getConversationDisplayName = (
  conversation: any,
  currentUserId: string
): string => {
  if (conversation.type === 'group') {
    return conversation.groupName || 'Group Chat'
  }
  
  const otherParticipant = conversation.participants.find(
    (p: any) => p.id !== currentUserId
  )
  
  return otherParticipant?.name || 'Unknown User'
}

export const getConversationAvatar = (
  conversation: any,
  currentUserId: string
): { initials: string; isOnline: boolean } => {
  if (conversation.type === 'group') {
    return {
      initials: 'GC',
      isOnline: false
    }
  }
  
  const otherParticipant = conversation.participants.find(
    (p: any) => p.id !== currentUserId
  )
  
  return {
    initials: getInitials(otherParticipant?.name || 'Unknown'),
    isOnline: otherParticipant?.online || false
  }
}

export const sortConversationsByPriority = (conversations: any[]): any[] => {
  return [...conversations].sort((a, b) => {
    // Pinned conversations first
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    
    // Then by unread count
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1
    
    // Finally by last message timestamp
    const aTime = new Date(a.lastMessage.timestamp).getTime()
    const bTime = new Date(b.lastMessage.timestamp).getTime()
    return bTime - aTime
  })
}

export const filterConversations = (
  conversations: any[],
  searchQuery: string
): any[] => {
  if (!searchQuery.trim()) return conversations
  
  const query = searchQuery.toLowerCase()
  
  return conversations.filter(conversation => {
    // Search in group name
    if (conversation.type === 'group' && conversation.groupName) {
      if (conversation.groupName.toLowerCase().includes(query)) return true
    }
    
    // Search in participant names
    const participantMatch = conversation.participants.some((participant: any) =>
      participant.name.toLowerCase().includes(query)
    )
    
    if (participantMatch) return true
    
    // Search in last message content
    if (conversation.lastMessage.content.toLowerCase().includes(query)) {
      return true
    }
    
    return false
  })
}