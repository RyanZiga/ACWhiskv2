export const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  RECIPE_UPLOAD: 'recipe_upload',
  FEED_POST: 'feed_post',
  RECIPE_LIKE: 'recipe_like',
  POST_LIKE: 'post_like',
  COMMENT: 'comment',
  RECIPE_COMMENT: 'recipe_comment',
  MENTION: 'mention',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system'
} as const

export const NOTIFICATION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const

export const NOTIFICATION_CATEGORIES = {
  SOCIAL: 'social',        // follows, likes, comments
  CONTENT: 'content',      // recipe uploads, posts
  SYSTEM: 'system',        // achievements, announcements
  ACTIVITY: 'activity'     // cooking sessions, events
} as const

export const RELEVANT_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.FOLLOW,
  NOTIFICATION_TYPES.RECIPE_UPLOAD,
  NOTIFICATION_TYPES.FEED_POST,
  NOTIFICATION_TYPES.RECIPE_LIKE,
  NOTIFICATION_TYPES.POST_LIKE,
  NOTIFICATION_TYPES.COMMENT,
  NOTIFICATION_TYPES.RECIPE_COMMENT
]

export const NOTIFICATION_SETTINGS_DEFAULTS = {
  [NOTIFICATION_TYPES.FOLLOW]: {
    email: true,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.MEDIUM
  },
  [NOTIFICATION_TYPES.RECIPE_UPLOAD]: {
    email: true,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.HIGH
  },
  [NOTIFICATION_TYPES.FEED_POST]: {
    email: false,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.MEDIUM
  },
  [NOTIFICATION_TYPES.RECIPE_LIKE]: {
    email: false,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.LOW
  },
  [NOTIFICATION_TYPES.POST_LIKE]: {
    email: false,
    push: false,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.LOW
  },
  [NOTIFICATION_TYPES.COMMENT]: {
    email: true,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.HIGH
  },
  [NOTIFICATION_TYPES.RECIPE_COMMENT]: {
    email: true,
    push: true,
    inApp: true,
    priority: NOTIFICATION_PRIORITIES.HIGH
  }
}

export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.FOLLOW]: '👥',
  [NOTIFICATION_TYPES.RECIPE_UPLOAD]: '👨‍🍳',
  [NOTIFICATION_TYPES.FEED_POST]: '📝',
  [NOTIFICATION_TYPES.RECIPE_LIKE]: '❤️',
  [NOTIFICATION_TYPES.POST_LIKE]: '👍',
  [NOTIFICATION_TYPES.COMMENT]: '💬',
  [NOTIFICATION_TYPES.RECIPE_COMMENT]: '💬',
  [NOTIFICATION_TYPES.MENTION]: '📢',
  [NOTIFICATION_TYPES.ACHIEVEMENT]: '🏆',
  [NOTIFICATION_TYPES.SYSTEM]: '⚙️'
}

export const NOTIFICATION_COLORS = {
  [NOTIFICATION_TYPES.FOLLOW]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-500'
  },
  [NOTIFICATION_TYPES.RECIPE_UPLOAD]: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: 'text-purple-500'
  },
  [NOTIFICATION_TYPES.FEED_POST]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500'
  },
  [NOTIFICATION_TYPES.RECIPE_LIKE]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500'
  },
  [NOTIFICATION_TYPES.POST_LIKE]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500'
  },
  [NOTIFICATION_TYPES.COMMENT]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500'
  },
  [NOTIFICATION_TYPES.RECIPE_COMMENT]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500'
  }
}

export const MAX_NOTIFICATIONS_PER_PAGE = 20
export const NOTIFICATION_CLEANUP_DAYS = 30
export const MAX_UNREAD_NOTIFICATIONS = 99