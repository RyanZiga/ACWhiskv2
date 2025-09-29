import React from 'react'
import { getNotificationIcon, getNotificationColor, formatTime } from './utils'
import { Notification } from './constants'

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type)

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(notification.timestamp)}
          </p>
        </div>
        
        {!notification.read && (
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        )}
      </div>
    </div>
  )
}