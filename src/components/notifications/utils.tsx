import { Bell, MessageSquare, Star, ChefHat, Heart, UserPlus } from 'lucide-react'

export const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'rating': return Star
    case 'comment': return MessageSquare
    case 'recipe': return ChefHat
    case 'forum': return MessageSquare
    case 'like': return Heart
    case 'follow': return UserPlus
    default: return Bell
  }
}

export const getNotificationColor = (type: string) => {
  switch (type) {
    case 'rating': return 'text-yellow-600 bg-yellow-100'
    case 'comment': return 'text-blue-600 bg-blue-100'
    case 'recipe': return 'text-purple-600 bg-purple-100'
    case 'forum': return 'text-green-600 bg-green-100'
    case 'like': return 'text-red-600 bg-red-100'
    case 'follow': return 'text-purple-600 bg-purple-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export const formatTime = (timestamp: Date) => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }
}