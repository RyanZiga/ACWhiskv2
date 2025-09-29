import React, { useState, useEffect } from 'react'
import { Bell, X, Heart, MessageCircle, UserPlus, ChefHat, Trophy, Award, Users, Share } from 'lucide-react'
import { projectId } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Notification {
  id: string
  type: 'follow' | 'recipe_upload' | 'feed_post' | 'recipe_like' | 'post_like' | 'comment'
  title: string
  message: string
  timestamp: Date
  read: boolean
  user_id?: string
  user_name?: string
  user_avatar?: string
  post_id?: string
  recipe_id?: string
  data?: any
}

interface NotificationsProps {
  user: User
}

export function Notifications({ user }: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
    
    // Set up real-time notifications polling
    const interval = setInterval(() => {
      loadNotifications()
    }, 60000) // Check every minute

    return () => {
      clearInterval(interval)
    }
  }, [user.id])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/notifications`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const { notifications: userNotifications } = await response.json()
        // Convert timestamp strings to Date objects
        const processedNotifications = userNotifications.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }))
        setNotifications(processedNotifications)
      } else {
        console.error('Failed to load notifications:', response.status, response.statusText)
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('Error response body:', errorText)
        setNotifications([])
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Notifications request timed out')
      } else {
        console.error('Error loading notifications:', error)
      }
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
    
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
    
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'recipe_upload':
      case 'recipe_like':
      case 'comment':
        if (notification.recipe_id) {
          console.log('Navigate to recipe:', notification.recipe_id)
          // In a real app, this would navigate to the recipe page
        }
        break
      case 'feed_post':
      case 'post_like':
        if (notification.post_id) {
          console.log('Navigate to post:', notification.post_id)
          // In a real app, this would navigate to the feed post
        }
        break
      case 'follow':
        if (notification.user_id) {
          console.log('Navigate to user profile:', notification.user_id)
          // In a real app, this would navigate to the user's profile
        }
        break
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'recipe_upload':
        return <ChefHat className="h-4 w-4 text-purple-500" />
      case 'feed_post':
        return <Share className="h-4 w-4 text-blue-500" />
      case 'recipe_like':
      case 'post_like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'bg-green-50 border-green-200'
      case 'recipe_upload':
        return 'bg-purple-50 border-purple-200'
      case 'feed_post':
        return 'bg-blue-50 border-blue-200'
      case 'recipe_like':
      case 'post_like':
        return 'bg-red-50 border-red-200'
      case 'comment':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return timestamp.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-target"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notifications Panel - Mobile Responsive */}
          <div className={`absolute z-40 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ${
            // Mobile: Full width with proper positioning
            window.innerWidth < 768 
              ? 'right-0 mt-2 w-screen max-w-sm max-h-[70vh]' 
              : 'right-0 mt-2 w-96 max-h-96'
          }`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-violet-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-purple-600">{unreadCount} unread</p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors touch-target"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                        !notification.read ? getNotificationColor(notification.type) : 'border-l-transparent'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 ml-2"></div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(notification.timestamp)}
                            </p>
                            
                            {notification.type === 'follow' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <Users className="h-3 w-3 mr-1" />
                                Follow
                              </span>
                            )}
                            
                            {notification.type === 'recipe_upload' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                <ChefHat className="h-3 w-3 mr-1" />
                                Recipe
                              </span>
                            )}
                            
                            {notification.type === 'feed_post' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <Share className="h-3 w-3 mr-1" />
                                Post
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">Activity from your network will appear here</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={markAllAsRead}
                  className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors touch-target"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}