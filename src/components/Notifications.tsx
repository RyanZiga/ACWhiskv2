import React, { useState, useEffect, useRef } from 'react'
import { Bell, X, Heart, MessageCircle, UserPlus, ChefHat, Trophy, Award, Users, Share } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { supabase } from '../utils/supabase/client'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Notification {
  id: string
  type: 'message' | 'follow' | 'recipe_upload' | 'feed_post' | 'recipe_like' | 'post_like' | 'comment'
  title: string
  message: string
  timestamp: Date
  read: boolean
  sender_id?: string
  sender_name?: string
  sender_avatar_url?: string
  conversation_id?: string
  post_id?: string
  recipe_id?: string
  comment_id?: string
  metadata?: any
}

interface NotificationsProps {
  user: User
  onNavigate?: (page: string, id?: string) => void
}

export function Notifications({ user, onNavigate }: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'right' | 'left'>('right')
  const notificationChannelRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    loadNotifications()
    setupRealtimeSubscription()
    
    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      cleanupSubscription()
      window.removeEventListener('resize', checkMobile)
    }
  }, [user.id])

  // Check dropdown position when opening to prevent overflow
  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 384 // w-96 = 24rem = 384px
      const spaceOnRight = window.innerWidth - buttonRect.right
      
      // If not enough space on right, position on left
      if (spaceOnRight < dropdownWidth && buttonRect.left > dropdownWidth) {
        setDropdownPosition('left')
      } else {
        setDropdownPosition('right')
      }
    }
  }, [isOpen, isMobile])

  // Setup realtime subscription for new notifications
  const setupRealtimeSubscription = () => {
    try {
      const channel = supabase
        .channel('user-notifications-panel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any
            setNotifications(prev => [{
              ...newNotification,
              timestamp: new Date(newNotification.created_at)
            }, ...prev])
            
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/icon.png'
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as any
            setNotifications(prev => prev.map(notif =>
              notif.id === updatedNotification.id
                ? { ...updatedNotification, timestamp: new Date(updatedNotification.created_at) }
                : notif
            ))
          }
        )
        .subscribe()

      notificationChannelRef.current = channel
    } catch (error) {
      console.error('❌ Error setting up notification subscription:', error)
    }
  }

  const cleanupSubscription = () => {
    if (notificationChannelRef.current) {
      supabase.removeChannel(notificationChannelRef.current)
      notificationChannelRef.current = null
    }
  }

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
          timestamp: new Date(notif.created_at || notif.timestamp)
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

  const handleNotificationClick = (notification: Notification, onNavigate?: (page: string, id?: string) => void) => {
    markAsRead(notification.id)
    setIsOpen(false)
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        if (notification.conversation_id && onNavigate) {
          onNavigate('messages', `conversation:${notification.conversation_id}`)
        }
        break
      case 'recipe_upload':
      case 'recipe_like':
      case 'comment':
        if (notification.recipe_id && onNavigate) {
          onNavigate('recipe', notification.recipe_id)
        }
        break
      case 'feed_post':
      case 'post_like':
        if (notification.post_id && onNavigate) {
          onNavigate('post', notification.post_id)
        }
        break
      case 'follow':
        if (notification.sender_id && onNavigate) {
          onNavigate('account', notification.sender_id)
        }
        break
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-primary" />
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
      case 'message':
        return 'bg-primary/10 border-primary/30'
      case 'follow':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
      case 'recipe_upload':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800'
      case 'feed_post':
        return 'bg-accent/10 border-accent/30'
      case 'recipe_like':
      case 'post_like':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
      case 'comment':
        return 'bg-accent/10 border-accent/30'
      default:
        return 'bg-secondary border-border'
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
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-foreground hover:text-sidebar-primary hover:bg-sidebar-accent rounded-lg transition-colors touch-target px-[13px] py-[7px]"
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
          
          {/* Notifications Panel - Mobile & Desktop Responsive */}
          <div 
            ref={dropdownRef}
            className={`z-40 post-card shadow-xl overflow-hidden rounded-lg ${
              isMobile 
                ? 'fixed bottom-20 left-4 right-4 max-h-[calc(100vh-6rem-env(safe-area-inset-bottom))] animate-slide-up pb-safe' 
                : `absolute mt-2 w-96 max-h-[min(32rem,calc(100vh-8rem))] animate-slide-down right-0`
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-secondary">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-primary">{unreadCount} unread</p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors touch-target"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={`overflow-y-auto ${isMobile ? 'max-h-[calc(100vh-16rem)]' : 'max-h-80'}`}>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-secondary/50 transition-colors cursor-pointer border-l-4 ${
                        !notification.read ? getNotificationColor(notification.type) : 'border-l-transparent'
                      }`}
                      onClick={() => handleNotificationClick(notification, onNavigate)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2"></div>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground/70">
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
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">Activity from your network will appear here</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="p-4 border-t border-border bg-secondary">
                <button
                  onClick={markAllAsRead}
                  className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium transition-colors touch-target"
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