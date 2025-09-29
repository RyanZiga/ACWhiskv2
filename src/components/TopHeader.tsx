import React, { useState, useEffect } from 'react'
import { Bell, Search, Moon, Sun, X } from 'lucide-react'
import { Notifications } from './Notifications'
import { User } from '../utils/auth'
import { useTheme } from '../contexts/ThemeContext'

interface TopHeaderProps {
  user: User
  currentPage: string
  onNavigate: (page: string) => void
}

export function TopHeader({ user, currentPage, onNavigate }: TopHeaderProps) {
  const { isDark, toggleTheme } = useTheme()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const getPageTitle = () => {
    switch (currentPage) {
      case 'feed': return 'Feed'
      case 'dashboard': return 'Dashboard'
      case 'forum': return 'Community Forum'
      case 'learning': return 'Learning Hub'
      case 'search': return 'Search'
      case 'messages': return 'Messages'
      case 'profile': return 'Profile'
      case 'account': return 'Account Settings'
      case 'admin': return 'Admin Panel'
      case 'recipes': return 'Assignments'
      default: return 'ACWhisk'
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onNavigate('search')
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="lg:ml-80 header-gradient sticky top-0 z-50">
      <div className="px-6 py-4 rounded-[13px] bg-[rgba(226,232,240,0)]">
        <div className="flex items-center justify-between">
          {/* Page Title */}
          <div className="ml-16 lg:ml-0 flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-[rgba(255,255,255,1)] truncate">
              {getPageTitle()}
            </h1>
            <p className="text-xs lg:text-sm text-[rgba(243,245,248,1)] mt-1 truncate">
              Welcome back, {user.name}
            </p>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4 relative z-10">
            {/* Search Toggle */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowSearch(!showSearch)
              }}
              className="relative p-2 lg:p-3 text-[rgba(253,253,253,1)] hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Search"
              type="button"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleTheme()
              }}
              className="relative p-2 lg:p-3 text-[rgba(233,235,237,1)] hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              type="button"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <Notifications user={user} />
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm lg:text-base font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {showSearch && (
          <div className="mt-4 transition-all duration-200">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes, people, forum posts..."
                  className="flex-1 px-4 py-3 pl-10 pr-12 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex justify-between items-center text-sm text-muted-foreground">
                <span>Press Enter to search or click the search icon</span>
                <button
                  type="submit"
                  className="px-3 py-1 btn-gradient rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}