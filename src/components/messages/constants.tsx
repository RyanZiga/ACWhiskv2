// Sample data for fallback when API is unavailable

export const sampleUsers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: '',
    online: true,
    role: 'instructor'
  },
  {
    id: '2', 
    name: 'Mike Chen',
    avatar: '',
    online: false,
    role: 'student'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    avatar: '',
    online: true,
    role: 'student'
  },
  {
    id: '4',
    name: 'David Kim',
    avatar: '',
    online: true,
    role: 'instructor'
  }
]

export const sampleConversations = [
  {
    id: 'conv1',
    type: 'direct',
    participants: [
      { id: '1', name: 'Sarah Johnson', avatar: '', online: true },
      { id: 'current', name: 'You', avatar: '', online: true }
    ],
    lastMessage: {
      content: 'Great work on your soufflé technique!',
      timestamp: new Date(Date.now() - 300000),
      senderId: '1'
    },
    unreadCount: 2
  },
  {
    id: 'conv2',
    type: 'direct',
    participants: [
      { id: '2', name: 'Mike Chen', avatar: '', online: false },
      { id: 'current', name: 'You', avatar: '', online: true }
    ],
    lastMessage: {
      content: 'Thanks for the recipe recommendations!',
      timestamp: new Date(Date.now() - 3600000),
      senderId: '2'
    },
    unreadCount: 0
  },
  {
    id: 'conv3',
    type: 'group',
    groupName: 'Baking Fundamentals',
    participants: [
      { id: '1', name: 'Sarah Johnson', avatar: '', online: true },
      { id: '3', name: 'Emily Rodriguez', avatar: '', online: true },
      { id: '4', name: 'David Kim', avatar: '', online: true },
      { id: 'current', name: 'You', avatar: '', online: true }
    ],
    lastMessage: {
      content: 'Don\'t forget about tomorrow\'s practical exam!',
      timestamp: new Date(Date.now() - 7200000),
      senderId: '1'
    },
    unreadCount: 1
  }
]

export const DEMO_CONVERSATIONS: any[] = []

export const DEMO_MESSAGES: Record<string, any[]> = {}

// Real API endpoints for reference
export const API_ENDPOINTS = {
  CONVERSATIONS: '/messages/conversations',
  MESSAGES: '/messages',
  SEND_MESSAGE: '/messages',
  USERS_CONTACTS: '/users/contacts',
  USERS_SEARCH: '/users/search'
}

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice'
} as const

// Conversation types  
export const CONVERSATION_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group'
} as const

// Real-time update intervals
export const UPDATE_INTERVALS = {
  MESSAGES: 5000,      // 5 seconds
  CONVERSATIONS: 30000, // 30 seconds
  TYPING: 1000         // 1 second
}

// File upload limits
export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,    // 5MB
  FILE_MAX_SIZE: 10 * 1024 * 1024,    // 10MB
  VOICE_MAX_SIZE: 25 * 1024 * 1024    // 25MB
}

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg']
}