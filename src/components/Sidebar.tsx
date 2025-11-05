import React, { useState } from 'react'
import { Home, ChefHat, MessageSquare, BookOpen, MessageCircle, User, LogOut, Shield, Menu, X, FileText, BarChart3, Moon, Sun, Bot, Plus, Briefcase, GraduationCap, Utensils } from 'lucide-react'
import { User as UserType } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { useTheme } from '../contexts/ThemeContext'
import { UserRoleBadge } from './UserRoleBadge'
import { projectId } from '../utils/supabase/info'

interface SidebarProps {
  user: UserType
  currentPage: string
  onNavigate: (page: string, id?: string) => void
  onLogout: () => void
  unreadMessagesCount?: number
  onCollapseChange?: (isCollapsed: boolean) => void
  onCreatePost?: () => void
}

interface SidebarContentProps {
  user: UserType
  currentPage: string
  onNavigate: (page: string, userId?: string) => void
  onLogout: () => void
  unreadMessagesCount: number
  isCollapsed: boolean
  navigation: Array<{ name: string; id: string; icon: any }>
  setIsMobileOpen: (open: boolean) => void
  isDark: boolean
  toggleTheme: () => void
}

// Move SidebarContent outside to prevent re-creation on every render
const SidebarContent = React.memo(({
  user,
  currentPage,
  onNavigate,
  onLogout,
  unreadMessagesCount,
  isCollapsed,
  navigation,
  setIsMobileOpen,
  isDark,
  toggleTheme
}: SidebarContentProps) => (
  <div className="flex flex-col h-full overflow-visible">
    {/* User Header */}
    <div className="p-6 pb-8 overflow-visible">
      {!isCollapsed ? (
        <div className="flex items-center space-x-3">
          {/* User Avatar, Name, and Role Badge */}
          <button
            onClick={() => onNavigate('account', user.id)}
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
            aria-label="Profile"
          >
            <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-[0_4px_12px_rgba(220,38,38,0.3)]">
              {user.avatar_url ? (
                <ImageWithFallback
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-foreground">{user.name}</span>
              <UserRoleBadge role={user.role} size="sm" />
            </div>
          </button>
        </div>
      ) : (
        // Collapsed state - just show avatar
        <button
          onClick={() => onNavigate('account', user.id)}
          className="flex items-center justify-center hover:opacity-90 transition-opacity w-full"
          aria-label="Profile"
        >
          <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(220,38,38,0.3)]">
            {user.avatar_url ? (
              <ImageWithFallback
                src={user.avatar_url}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </button>
      )}
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = currentPage === item.id
        
        return (
          <button
            key={item.id}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // For portfolio, always navigate to current user's portfolio
              if (item.id === 'portfolio') {
                onNavigate(item.id, user.id)
              } else {
                onNavigate(item.id)
              }
              setIsMobileOpen(false)
            }}
            className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[52px] ${
              isActive
                ? 'bg-primary text-white shadow-lg'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
            type="button"
          >
            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-sidebar-foreground/70'}`} />
            {!isCollapsed && (
              <span className={`font-medium ${isActive ? 'text-white' : ''}`}>{item.name}</span>
            )}
            {/* Show unread messages badge */}
            {!isCollapsed && item.id === 'messages' && unreadMessagesCount > 0 && (
              <span className="ml-auto bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>

    {/* Bottom section - Dark Mode Toggle, Settings, Sign out */}
    <div className="p-4 border-t border-sidebar-border mt-auto space-y-1">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleTheme()
        }}
        className="w-full flex items-center space-x-4 px-5 py-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[52px] text-sidebar-foreground hover:bg-sidebar-accent/50"
        type="button"
      >
        {isDark ? (
          <Moon className="h-5 w-5 text-sidebar-foreground/70" />
        ) : (
          <Sun className="h-5 w-5 text-sidebar-foreground/70" />
        )}
        {!isCollapsed && (
          <span className="font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        )}
        {!isCollapsed && (
          <div className="ml-auto">
            <div className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
              isDark 
                ? 'bg-primary shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                : 'bg-gray-300 dark:bg-gray-600 shadow-inner'
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${
                isDark ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
          </div>
        )}
      </button>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onLogout()
        }}
        className="w-full flex items-center space-x-4 px-5 py-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[52px] text-sidebar-foreground hover:bg-sidebar-accent/50"
        type="button"
      >
        <LogOut className="h-5 w-5 text-sidebar-foreground/70" />
        {!isCollapsed && (
          <span className="font-medium">Sign out</span>
        )}
      </button>
    </div>
  </div>
))

export function Sidebar({ user, currentPage, onNavigate, onLogout, unreadMessagesCount = 0, onCollapseChange, onCreatePost }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  // Close profile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isProfileMenuOpen && !target.closest('.profile-menu-container')) {
        setIsProfileMenuOpen(false)
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isProfileMenuOpen])

  // Notify parent component when collapse state changes
  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }

  // Role-based navigation
  const getNavigationItems = () => {
    // Admin users only see Admin Dashboard and User Management
    if (user.role === 'admin') {
      return [
        { name: 'Admin Dashboard', id: 'admin', icon: BarChart3 },
        { name: 'User Management', id: 'user-management', icon: Shield },
      ]
    }

    // Instructor users see Student Management and Dish Evaluations along with regular navigation
    if (user.role === 'instructor') {
      return [
        { name: 'Feed', id: 'feed', icon: Home },
        { name: 'Portfolio', id: 'portfolio', icon: Briefcase },
        { name: 'Learning', id: 'learning', icon: BookOpen },
        { name: 'Messages', id: 'messages', icon: MessageSquare },
        { name: 'Dish Evaluations', id: 'dish-evaluations', icon: Utensils },
        { name: 'Student Management', id: 'student-management', icon: GraduationCap },
      ]
    }

    // Regular student users see Dish Evaluations along with standard navigation
    const baseNavigation = [
      { name: 'Feed', id: 'feed', icon: Home },
      { name: 'Portfolio', id: 'portfolio', icon: Briefcase },
      { name: 'Learning', id: 'learning', icon: BookOpen },
      { name: 'Messages', id: 'messages', icon: MessageSquare },
      { name: 'Dish Evaluations', id: 'dish-evaluations', icon: Utensils },
    ]

    return baseNavigation
  }

  const navigation = getNavigationItems()

  return (
    <>
      {/* Profile Menu Dropdown - Mobile Only - Modern Design */}
      {isProfileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setIsProfileMenuOpen(false)}
          />
          <div className="lg:hidden fixed bottom-24 right-4 left-4 z-50 profile-menu-container animate-scale-in">
            <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              {/* User Info Header */}
              <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                    {user.avatar_url ? (
                      <ImageWithFallback
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{user.name}</p>
                    <UserRoleBadge role={user.role} size="sm" />
                  </div>
                </div>
              </div>

              <div className="py-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onNavigate('account', user.id)
                    setIsProfileMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-5 py-3.5 text-sidebar-foreground hover:bg-primary/5 active:bg-primary/10 transition-all duration-200 group"
                  type="button"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">Profile</span>
                </button>
                
                {/* Only show Learning for non-admin users */}
                {user.role !== 'admin' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onNavigate('learning')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-3 px-5 py-3.5 text-sidebar-foreground hover:bg-primary/5 active:bg-primary/10 transition-all duration-200 group"
                    type="button"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <BookOpen className="h-5 w-5 text-accent" />
                    </div>
                    <span className="font-medium">Learning</span>
                  </button>
                )}

                {/* Messages for instructor */}
                {user.role === 'instructor' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onNavigate('messages')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-3 px-5 py-3.5 text-sidebar-foreground hover:bg-primary/5 active:bg-primary/10 transition-all duration-200 group"
                    type="button"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="font-medium">Messages</span>
                    {unreadMessagesCount > 0 && (
                      <span className="ml-auto bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="h-px bg-border/50 my-2 mx-4" />

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleTheme()
                  }}
                  className="w-full flex items-center space-x-3 px-5 py-3.5 text-sidebar-foreground hover:bg-primary/5 active:bg-primary/10 transition-all duration-200 group"
                  type="button"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    {isDark ? (
                      <Moon className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <span className="font-medium flex-1">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                  <div className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                    isDark 
                      ? 'bg-primary shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                      : 'bg-gray-300 dark:bg-gray-600 shadow-inner'
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${
                      isDark ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </button>

                <div className="h-px bg-border/50 my-2 mx-4" />

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onLogout()
                    setIsProfileMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-5 py-3.5 text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-all duration-200 group"
                  type="button"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="sidebar-gradient border-t border-sidebar-border">
          {user.role === 'admin' ? (
            /* Admin Navigation - Admin Dashboard and User Management */
            <div className="flex items-center justify-around px-4 py-[5px]">
              {/* Admin Dashboard */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('admin')
                }}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'admin'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <BarChart3 className={`h-6 w-6 ${currentPage === 'admin' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'admin' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* User Management */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('user-management')
                }}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'user-management'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Shield className={`h-6 w-6 ${currentPage === 'user-management' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'user-management' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Menu */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsProfileMenuOpen(!isProfileMenuOpen)
                }}
                className="flex flex-col items-center justify-center px-4 py-2 rounded-[20px] transition-all duration-300 touch-target relative z-10 profile-menu-container group"
                type="button"
              >
                <div className={`relative transition-all duration-300 ${
                  (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile') 
                    ? 'scale-110 -translate-y-0.5' 
                    : 'scale-100 group-active:scale-95'
                }`}>
                  <Menu className={`h-6 w-6 transition-all duration-300 ${
                    (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile') 
                      ? 'text-primary drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]' 
                      : 'text-sidebar-foreground/60'
                  }`} />
                  {(isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile') && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  )}
                </div>
              </button>
            </div>
          ) : user.role === 'instructor' ? (
            /* Instructor Navigation */
            <div className="flex items-center justify-around px-[0px] py-[5px]">
              {/* Feed */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('feed')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'feed'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Home className={`h-6 w-6 ${currentPage === 'feed' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'feed' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Dish Evaluations */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('dish-evaluations')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'dish-evaluations'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Utensils className={`h-6 w-6 ${currentPage === 'dish-evaluations' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'dish-evaluations' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Create Post Button - Floating FAB */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCreatePost?.()
                }}
                className="flex flex-col items-center justify-center px-2 transition-all duration-300 touch-target relative z-10 group -mt-2"
                type="button"
              >
                <div className="w-14 h-14 avatar-gradient rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(220,38,38,0.4)] dark:shadow-[0_4px_24px_rgba(239,68,68,0.5)] transition-all duration-300 group-hover:shadow-[0_6px_32px_rgba(220,38,38,0.5)] group-active:scale-95 group-hover:scale-105 border-4 border-card">
                  <Plus className="h-7 w-7 text-white transition-transform duration-300 group-active:rotate-90" />
                </div>
              </button>

              {/* Student Management */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('student-management')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'student-management'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <GraduationCap className={`h-6 w-6 ${currentPage === 'student-management' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'student-management' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Menu */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsProfileMenuOpen(!isProfileMenuOpen)
                }}
                className="flex flex-col items-center justify-center px-3 py-2 rounded-[20px] transition-all duration-300 touch-target relative z-10 profile-menu-container group"
                type="button"
              >
                <div className={`relative transition-all duration-300 ${
                  (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning' || currentPage === 'messages') 
                    ? 'scale-110 -translate-y-0.5' 
                    : 'scale-100 group-active:scale-95'
                }`}>
                  <Menu className={`h-6 w-6 transition-all duration-300 ${
                    (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning' || currentPage === 'messages') 
                      ? 'text-primary drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]' 
                      : 'text-sidebar-foreground/60'
                  }`} />
                  {(isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning' || currentPage === 'messages') && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  )}
                </div>
              </button>
            </div>
          ) : (
            /* Regular User Navigation */
            <div className="flex items-center justify-around px-[0px] py-[5px]">
              {/* Feed */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('feed')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'feed'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Home className={`h-6 w-6 ${currentPage === 'feed' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'feed' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Dish Evaluations */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('dish-evaluations')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'dish-evaluations'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Utensils className={`h-6 w-6 ${currentPage === 'dish-evaluations' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                
                {currentPage === 'dish-evaluations' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Create Post Button - Floating FAB */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCreatePost?.()
                }}
                className="flex flex-col items-center justify-center px-2 transition-all duration-300 touch-target relative z-10 group -mt-2"
                type="button"
              >
                <div className="w-14 h-14 avatar-gradient rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(220,38,38,0.4)] dark:shadow-[0_4px_24px_rgba(239,68,68,0.5)] transition-all duration-300 group-hover:shadow-[0_6px_32px_rgba(220,38,38,0.5)] group-active:scale-95 group-hover:scale-105 border-4 border-card">
                  <Plus className="h-7 w-7 text-white transition-transform duration-300 group-active:rotate-90" />
                </div>
              </button>

              {/* Messages */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('messages')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'messages'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <MessageSquare className={`h-6 w-6 ${currentPage === 'messages' ? 'scale-110' : ''} transition-transform duration-200`} />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                
                {currentPage === 'messages' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>

              {/* Menu */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsProfileMenuOpen(!isProfileMenuOpen)
                }}
                className="flex flex-col items-center justify-center px-3 py-2 rounded-[20px] transition-all duration-300 touch-target relative z-10 profile-menu-container group"
                type="button"
              >
                <div className={`relative transition-all duration-300 ${
                  (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') 
                    ? 'scale-110 -translate-y-0.5' 
                    : 'scale-100 group-active:scale-95'
                }`}>
                  <Menu className={`h-6 w-6 transition-all duration-300 ${
                    (isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') 
                      ? 'text-primary drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]' 
                      : 'text-sidebar-foreground/60'
                  }`} />
                  {(isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile More Menu Modal */}
      {isMobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 sidebar-gradient z-50 shadow-2xl rounded-t-3xl animate-slide-up pb-safe">
            <div className="p-6">
              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
              
              {/* User Info */}
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-sidebar-border">
                <div className="avatar-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>

              {/* More Options */}
              <div className="space-y-2">
                {user.role === 'admin' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onNavigate('admin')
                      setIsMobileOpen(false)
                    }}
                    className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 touch-target text-sidebar-foreground hover:bg-sidebar-accent/50"
                    type="button"
                  >
                    <Shield className="h-5 w-5 text-sidebar-foreground/70" />
                    <span className="font-medium">Admin Panel</span>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleTheme()
                  }}
                  className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 touch-target text-sidebar-foreground hover:bg-sidebar-accent/50"
                  type="button"
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 text-sidebar-foreground/70" />
                  ) : (
                    <Moon className="h-5 w-5 text-sidebar-foreground/70" />
                  )}
                  <span className="font-medium">Dark Mode</span>
                  <div className="ml-auto">
                    <div className={`w-12 h-6 shadow-lg rounded-full transition-colors duration-200 relative ${
                      isDark ? 'bg-primary' : 'bg-muted'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                        isDark ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onNavigate('account')
                    setIsMobileOpen(false)
                  }}
                  className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 touch-target text-sidebar-foreground hover:bg-sidebar-accent/50"
                  type="button"
                >
                  <Settings className="h-5 w-5 text-sidebar-foreground/70" />
                  <span className="font-medium">Settings</span>
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onLogout()
                  }}
                  className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-200 touch-target text-destructive hover:bg-destructive/10"
                  type="button"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar - Floating */}
      <div
        className={`hidden lg:block fixed left-6 top-6 bottom-6 sidebar-gradient shadow-2xl transition-all duration-300 z-30 rounded-2xl overflow-visible ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent
          user={user}
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          unreadMessagesCount={unreadMessagesCount}
          isCollapsed={isCollapsed}
          navigation={navigation}
          setIsMobileOpen={setIsMobileOpen}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      </div>
    </>
  )
}