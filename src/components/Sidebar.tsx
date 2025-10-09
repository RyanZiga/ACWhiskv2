import React, { useState } from 'react'
import { Home, ChefHat, MessageSquare, BookOpen, MessageCircle, Settings, User, LogOut, Shield, Menu, X, FileText, BarChart3 } from 'lucide-react'
import { User as UserType } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'

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


  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Feed', id: 'feed', icon: Home },
      { name: 'Assignments', id: 'recipes', icon: FileText },
      { name: 'Forum', id: 'forum', icon: MessageSquare },
      { name: 'Learning', id: 'learning', icon: BookOpen },
      { name: 'Messages', id: 'messages', icon: MessageCircle }
    ]


    if (user.role === 'admin') {
      baseNavigation.splice(1, 0, { name: 'Admin Panel', id: 'admin', icon: Shield })
    }

    return baseNavigation
  }

  const navigation = getNavigationItems()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      <div className="p-6 border-b border-sidebar-border">
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
              <span className="font-bold text-xl text-sidebar-foreground group-hover:text-sidebar-primary transition-colors">
                ACWhisk
              </span>
              <p className="text-sm text-sidebar-foreground/70">Culinary Community</p>
            </div>
          )}
        </button>
      </div>


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
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-sm border border-sidebar-border'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary'
              }`}
              type="button"
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-primary'}`} />
              {!isCollapsed && (
                <span className="font-medium flex-1">{item.name}</span>
              )}

              {item.id === 'messages' && unreadMessagesCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full font-medium">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>


      <div className="p-4 border-t border-sidebar-border space-y-2">


        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onNavigate('profile')
            setIsMobileOpen(false)
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200 touch-manipulation min-h-[48px]"
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
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 touch-manipulation min-h-[48px]"
          type="button"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>


      <div className="hidden lg:block p-4 border-t border-sidebar-border">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsCollapsed(!isCollapsed)
          }}
          className="w-full flex items-center justify-center px-4 py-2 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200 touch-manipulation min-h-[44px]"
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


      <div className={`lg:hidden fixed inset-y-0 left-0 z-[58] w-80 transform transition-transform duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full sidebar-gradient">

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsMobileOpen(false)
            }}
            className="absolute top-4 right-4 p-3 text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/50 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent />
        </div>
      </div>


      <div className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}>
        <div className="h-full rounded-[0px] sidebar-gradient px-[-13px] py-[0px]">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}
