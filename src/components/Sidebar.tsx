import React, { useState } from 'react'
import { Home, ChefHat, MessageSquare, BookOpen, MessageCircle, Settings, User, LogOut, Shield, Menu, X, FileText, BarChart3 } from 'lucide-react'
import { User as UserType } from '../utils/auth'

interface SidebarProps {
  user: UserType
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  unreadMessagesCount?: number
}

export function Sidebar({ user, currentPage, onNavigate, onLogout, unreadMessagesCount = 0 }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Role-based navigation
  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Feed', id: 'feed', icon: Home },
      { name: 'Assignments', id: 'recipes', icon: FileText },
      { name: 'Forum', id: 'forum', icon: MessageSquare },
      { name: 'Learning', id: 'learning', icon: BookOpen },
      { name: 'Messages', id: 'messages', icon: MessageCircle }
    ]

    // Add Dashboard only for admins
    if (user.role === 'admin') {
      baseNavigation.splice(1, 0, { name: 'Dashboard', id: 'dashboard', icon: BarChart3 })
    }



    // Add admin-only items
    if (user.role === 'admin') {
      baseNavigation.push({ name: 'Admin Panel', id: 'admin', icon: Shield })
    }

    return baseNavigation
  }

  const navigation = getNavigationItems()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-white/20 dark:border-gray-700/50">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onNavigate('feed')
            setIsMobileOpen(false)
          }}
          className="flex items-center space-x-3 group w-full touch-manipulation min-h-[48px]"
          type="button"
        >
          <div className="avatar-gradient w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-bold text-xl text-white dark:text-white group-hover:text-yellow-300 dark:group-hover:text-blue-200 transition-colors drop-shadow-sm">
                ACWhisk
              </span>
              <p className="text-sm text-white/80 dark:text-gray-300">Culinary Community</p>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onNavigate(item.id)
                setIsMobileOpen(false)
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group touch-manipulation min-h-[48px] ${
                isActive
                  ? 'bg-white/30 dark:bg-white/10 text-white dark:text-white shadow-lg backdrop-blur-md border border-white/40 dark:border-white/20'
                  : 'text-white/80 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5 hover:text-white dark:hover:text-white'
              }`}
              type="button"
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white dark:text-white' : 'text-white/70 dark:text-gray-400 group-hover:text-white dark:group-hover:text-white'}`} />
              {!isCollapsed && (
                <span className="font-medium flex-1">{item.name}</span>
              )}
              {/* Show unread messages badge */}
              {item.id === 'messages' && unreadMessagesCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full font-medium">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-white/20 dark:border-gray-700/50 space-y-2">

        {/* Profile */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onNavigate('profile')
            setIsMobileOpen(false)
          }}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 touch-manipulation min-h-[48px] ${
            currentPage === 'profile'
              ? 'bg-white/30 dark:bg-white/10 text-white dark:text-white shadow-lg backdrop-blur-md border border-white/40 dark:border-white/20'
              : 'text-white/80 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5 hover:text-white dark:hover:text-white'
          }`}
          type="button"
        >
          <div className="avatar-gradient w-8 h-8 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-left">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-white/60 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
          )}
        </button>

        {/* Account Settings */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onNavigate('account')
            setIsMobileOpen(false)
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/80 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5 hover:text-white dark:hover:text-white transition-all duration-200 touch-manipulation min-h-[48px]"
          type="button"
        >
          <Settings className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>

        {/* Logout */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLogout()
            setIsMobileOpen(false)
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200 touch-manipulation min-h-[48px]"
          type="button"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      <div className="hidden lg:block p-4 border-t border-white/20 dark:border-gray-700/50">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsCollapsed(!isCollapsed)
          }}
          className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-white/70 dark:text-white/60 hover:bg-white/20 dark:hover:bg-white/10 hover:text-white dark:hover:text-white transition-all duration-200 touch-manipulation min-h-[44px]"
          type="button"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsMobileOpen(true)
        }}
        className="lg:hidden fixed top-4 left-4 z-[60] p-3 btn-gradient text-white rounded-xl shadow-lg backdrop-blur-md border border-white/20 touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
        type="button"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsMobileOpen(false)
          }}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-[58] w-80 transform transition-transform duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full sidebar-gradient">
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsMobileOpen(false)
            }}
            className="absolute top-4 right-4 p-3 text-white/80 dark:text-white/80 hover:text-white dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}>
        <div className="h-full rounded-[28px] sidebar-gradient">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}