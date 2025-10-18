import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Notifications } from './Notifications'
import { User } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { projectId } from '../utils/supabase/info'
import logoImage from 'figma:asset/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png'

interface TopHeaderProps {
  user: User
  currentPage: string
  onNavigate: (page: string, id?: string) => void
  onLogout?: () => void
  isSidebarCollapsed?: boolean
}

interface SearchResult {
  id: string
  name: string
  avatar_url?: string
  role: string
  bio?: string
}

export function TopHeader({ user, currentPage, onNavigate, onLogout, isSidebarCollapsed = false }: TopHeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const getPageTitle = () => {
    switch (currentPage) {
      case 'feed': return 'Feed'
      case 'dashboard': return 'Dashboard'
      case 'forum': return 'Community Forum'
      case 'learning': return 'Learning Hub'
      case 'search': return 'Search'
      case 'messages': return 'Messages'
      case 'profile': return 'Profile'
      case 'account': return 'Profile'
      case 'admin': return 'Admin Panel'
      case 'recipes': return 'Assignments'
      default: return 'ACWhisk'
    }
  }


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const searchUsers = async (query: string) => {
    try {
      setIsSearching(true)
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/search/users?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const responseData = await response.json()
        const users = responseData?.users || []
        const filteredUsers = users
          .filter((u: any) => u.id && u.id !== user.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name || 'Unknown User',
            role: u.role || 'student',
            avatar_url: u.avatar_url,
            bio: u.bio
          }))
        
        setSearchResults(filteredUsers)
        setShowResults(true)
      } else {
        console.error('User search failed:', response.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('User search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserClick = (userId: string) => {
    onNavigate('account', userId)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onNavigate('search')
      setShowSearch(false)
      setSearchQuery('')
      setSearchResults([])
      setShowResults(false)
    }
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <header className={`z-40 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[5.5rem]' : 'lg:ml-[18rem]'}`}>
      <div className="px-4 py-3 pl-4 lg:px-6 lg:py-4 lg:pl-8">
        <div className="flex items-center justify-between gap-4">
          {/* ACWhisk Logo */}
          <button
            onClick={() => onNavigate('feed')}
            className="flex items-center space-x-2 group flex-shrink-0 rounded-xl px-3 py-2 -ml-2 lg:ml-0 lg:px-2 lg:py-0 transition-all duration-300 "
          >
            <ImageWithFallback
              src={logoImage}
              alt="ACWhisk Logo"
              className="w-9 h-9 lg:w-10 lg:h-10 object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_2px_4px_rgba(220,38,38,0.3)] dark:drop-shadow-[0_2px_4px_rgba(239,68,68,0.4)]"
            />
            <span className="font-bold text-lg lg:text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
              ACWhisk
            </span>
          </button>


          <div className="flex items-center space-x-2 lg:space-x-4 relative z-10">

            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowSearch(!showSearch)
              }}
              className="relative p-2 lg:p-3 text-foreground hover:text-primary hover:bg-secondary rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Search"
              type="button"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <Notifications user={user} onNavigate={onNavigate} />
            </div>
          </div>
        </div>


        {showSearch && (
          <div className="mt-4 transition-all duration-200" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name..."
                  className="input-clean w-full px-4 py-3 pl-10 pr-12"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setShowResults(false)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>


              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 post-card max-h-96 overflow-y-auto z-50 shadow-lg">
                  {isSearching ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          Users ({searchResults.length})
                        </p>
                      </div>
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleUserClick(result.id)}
                          className="w-full flex items-center space-x-3 p-4 hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {result.avatar_url ? (
                              <ImageWithFallback
                                src={result.avatar_url}
                                alt={result.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-white">
                                {getInitials(result.name)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-medium text-foreground truncate">
                              {result.name}
                            </h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              {result.role}
                            </p>
                            {result.bio && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {result.bio}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No users found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try searching with a different name
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-2 flex justify-between items-center text-sm text-muted-foreground">
                <span>Search for users or press Enter for advanced search</span>
                <button
                  type="submit"
                  className="px-3 py-1 btn-gradient rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Advanced Search
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}