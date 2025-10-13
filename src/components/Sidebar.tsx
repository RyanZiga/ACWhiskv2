import React, { useState } from 'react'
import { Home, ChefHat, MessageSquare, BookOpen, MessageCircle, Settings, User, LogOut, Shield, Menu, X, FileText, BarChart3, Moon, Sun, Bot, Plus, Bell, Search } from 'lucide-react'
import { User as UserType } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { useTheme } from '../contexts/ThemeContext'
import { Notifications } from './Notifications'
import { UserRoleBadge } from './UserRoleBadge'
import { projectId } from '../utils/supabase/info'

interface SidebarProps {
  user: UserType
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  unreadMessagesCount?: number
  onCollapseChange?: (isCollapsed: boolean) => void
  onCreatePost?: () => void
}

export function Sidebar({ user, currentPage, onNavigate, onLogout, unreadMessagesCount = 0, onCollapseChange, onCreatePost }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  // Search state
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{
    users: any[]
    posts: any[]
    recipes: any[]
  }>({ users: [], posts: [], recipes: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDropdownRef = React.useRef<HTMLDivElement>(null)


  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isProfileMenuOpen && !target.closest('.profile-menu-container')) {
        setIsProfileMenuOpen(false)
      }

      if (searchDropdownRef.current && !searchDropdownRef.current.contains(target as Node)) {
        setShowSearchDropdown(false)
      }
    }

    if (isProfileMenuOpen || showSearchDropdown) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isProfileMenuOpen, showSearchDropdown])


  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onCollapseChange?.(newCollapsedState)
  }


  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [], recipes: [] })
      return
    }

    setSearchLoading(true)

    try {

      const [usersResponse, postsResponse, assignmentsResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/assignments/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        )
      ])

      const users = usersResponse.ok ? (await usersResponse.json()).users || [] : []
      const posts = postsResponse.ok ? (await postsResponse.json()).posts || [] : []
      const recipes = assignmentsResponse.ok ? (await assignmentsResponse.json()).assignments || [] : []

      setSearchResults({ users, posts, recipes })
    } catch (error) {
      console.error("Error searching:", error)
      setSearchResults({ users: [], posts: [], recipes: [] })
    } finally {
      setSearchLoading(false)
    }
  }


  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Feed', id: 'feed', icon: Home },
      { name: 'Assignments', id: 'recipes', icon: FileText },
      { name: 'Messages', id: 'messages', icon: MessageCircle },
      { name: 'Forum', id: 'forum', icon: MessageSquare },
      { name: 'Learning', id: 'learning', icon: BookOpen },
    ]


    if (user.role === 'admin') {
      baseNavigation.push({ name: 'Admin Panel', id: 'admin', icon: Shield })
    }

    return baseNavigation
  }

  const navigation = getNavigationItems()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      <div className="p-6 pb-8">
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between mb-4">

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


              <Notifications user={user} onNavigate={onNavigate} />
            </div>


            <div className="relative">
              <input
                type="text"
                placeholder="Search users, posts, recipes... (Press Enter)"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchQuery(value)

                  if (value.trim().length === 0) {
                    setSearchResults({ users: [], posts: [], recipes: [] })
                    setSearchLoading(false)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = searchQuery.trim()
                    if (value.length >= 2) {
                      handleSearch(value)
                    }
                  }
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 input-clean text-sm"
              />


              {showSearchDropdown && (
                <div ref={searchDropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-slide-down z-50">

                  <div className="max-h-96 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 text-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-muted-foreground mt-2">Searching...</p>
                      </div>
                    ) : searchQuery.trim() === "" ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Start typing to search...
                      </div>
                    ) : (
                      <>

                        {searchResults.users.length > 0 && (
                          <div className="border-b border-border">
                            <div className="px-3 py-2 bg-muted/50">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Users</h4>
                            </div>
                            {searchResults.users.map((searchUser) => (
                              <button
                                key={searchUser.id}
                                onClick={() => {
                                  onNavigate('account', searchUser.id)
                                  setShowSearchDropdown(false)
                                  setSearchQuery("")
                                }}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                              >
                                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {searchUser.avatar_url ? (
                                    <ImageWithFallback
                                      src={searchUser.avatar_url}
                                      alt={searchUser.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-white text-sm font-medium">
                                      {searchUser.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{searchUser.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{searchUser.role}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}


                        {searchResults.posts.length > 0 && (
                          <div className="border-b border-border">
                            <div className="px-3 py-2 bg-muted/50">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Posts</h4>
                            </div>
                            {searchResults.posts.map((post: any) => (
                              <button
                                key={post.id}
                                onClick={() => {
                                  onNavigate('feed')
                                  setShowSearchDropdown(false)
                                  setSearchQuery("")
                                }}
                                className="w-full flex items-start space-x-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                              >
                                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {post.author?.avatar_url ? (
                                    <ImageWithFallback
                                      src={post.author.avatar_url}
                                      alt={post.author.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-white text-sm font-medium">
                                      {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{post.author?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span>{post.likes} likes</span>
                                    <span>{post.comments} comments</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}


                        {searchResults.recipes.length > 0 && (
                          <div className="border-b border-border">
                            <div className="px-3 py-2 bg-muted/50">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Assignments</h4>
                            </div>
                            {searchResults.recipes.map((assignment: any) => (
                              <button
                                key={assignment.id}
                                onClick={() => {
                                  onNavigate('recipes')
                                  setShowSearchDropdown(false)
                                  setSearchQuery("")
                                }}
                                className="w-full flex items-start space-x-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                              >
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</p>
                                  {assignment.due_date && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* No Results */}
                        {searchResults.users.length === 0 && 
                         searchResults.posts.length === 0 &&
                         searchResults.recipes.length === 0 &&
                         searchQuery.trim() !== "" && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No results found for "{searchQuery}"
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
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
      <nav className="flex-1 px-4 space-y-1">
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
            onNavigate('account')
          }}
          className="w-full flex items-center space-x-4 px-5 py-3.5 rounded-xl transition-all duration-200 group touch-manipulation min-h-[52px] text-sidebar-foreground hover:bg-sidebar-accent/50"
          type="button"
        >
          <Settings className="h-5 w-5 text-sidebar-foreground/70" />
          {!isCollapsed && (
            <span className="font-medium">Settings</span>
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
  )

  return (
    <>
      {/* Search Dropdown - Mobile Only */}
      {showSearchDropdown && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowSearchDropdown(false)}
          />
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-50">
            <div ref={searchDropdownRef} className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[60vh] flex flex-col">
              {/* Search Input */}
              <div className="p-4 border-b border-border">
                <input
                  type="text"
                  placeholder="Search users, posts, assignments... (Press Enter)"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    // Clear results if empty, but don't trigger API call on every keystroke
                    if (value.trim().length === 0) {
                      setSearchResults({ users: [], posts: [], recipes: [] })
                      setSearchLoading(false)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = searchQuery.trim()
                      if (value.length >= 2) {
                        handleSearch(value)
                      }
                    }
                  }}
                  className="w-full px-4 py-3 input-clean text-sm"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="overflow-y-auto flex-1">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-muted-foreground mt-2">Searching...</p>
                  </div>
                ) : searchQuery.trim() === "" ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Start typing to search...
                  </div>
                ) : (
                  <>
                    {/* Users Results */}
                    {searchResults.users.length > 0 && (
                      <div className="border-b border-border">
                        <div className="px-4 py-2 bg-muted/50">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Users</h4>
                        </div>
                        {searchResults.users.map((searchUser) => (
                          <button
                            key={searchUser.id}
                            onClick={() => {
                              onNavigate('account', searchUser.id)
                              setShowSearchDropdown(false)
                              setSearchQuery("")
                            }}
                            className="w-full flex items-center space-x-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {searchUser.avatar_url ? (
                                <ImageWithFallback
                                  src={searchUser.avatar_url}
                                  alt={searchUser.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white text-sm font-medium">
                                  {searchUser.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{searchUser.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{searchUser.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Posts Results */}
                    {searchResults.posts.length > 0 && (
                      <div className="border-b border-border">
                        <div className="px-4 py-2 bg-muted/50">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Posts</h4>
                        </div>
                        {searchResults.posts.map((post: any) => (
                          <button
                            key={post.id}
                            onClick={() => {
                              onNavigate('feed')
                              setShowSearchDropdown(false)
                              setSearchQuery("")
                            }}
                            className="w-full flex items-start space-x-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {post.author?.avatar_url ? (
                                <ImageWithFallback
                                  src={post.author.avatar_url}
                                  alt={post.author.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white text-sm font-medium">
                                  {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{post.author?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{post.likes} likes</span>
                                <span>{post.comments} comments</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Assignments Results */}
                    {searchResults.recipes.length > 0 && (
                      <div className="border-b border-border">
                        <div className="px-4 py-2 bg-muted/50">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Assignments</h4>
                        </div>
                        {searchResults.recipes.map((assignment: any) => (
                          <button
                            key={assignment.id}
                            onClick={() => {
                              onNavigate('recipes')
                              setShowSearchDropdown(false)
                              setSearchQuery("")
                            }}
                            className="w-full flex items-start space-x-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</p>
                              {assignment.due_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.users.length === 0 && 
                     searchResults.posts.length === 0 &&
                     searchResults.recipes.length === 0 &&
                     searchQuery.trim() !== "" && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Menu Dropdown - Mobile Only */}
      {isProfileMenuOpen && (
        <div className="lg:hidden fixed bottom-20 right-4 z-50 profile-menu-container">
          <div className="sidebar-gradient border border-sidebar-border rounded-2xl shadow-2xl overflow-hidden min-w-[200px] animate-slide-up">
            <div className="py-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('account', user.id)
                  setIsProfileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                type="button"
              >
                <User className="h-5 w-5 text-sidebar-foreground/70" />
                <span className="font-medium">Profile</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('learning')
                  setIsProfileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                type="button"
              >
                <BookOpen className="h-5 w-5 text-sidebar-foreground/70" />
                <span className="font-medium">Learning</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleTheme()
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                type="button"
              >
                {isDark ? (
                  <Moon className="h-5 w-5 text-sidebar-foreground/70" />
                ) : (
                  <Sun className="h-5 w-5 text-sidebar-foreground/70" />
                )}
                <span className="font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
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
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('profile')
                  setIsProfileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
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
                  setIsProfileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                type="button"
              >
                <LogOut className="h-5 w-5 text-sidebar-foreground/70" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="sidebar-gradient border-t border-sidebar-border rounded-[84px]">
          <div className="flex items-center justify-around px-[20px] rounded-[-8px] rounded-[-56px] p-[7px]">
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
              <span className={`text-[11px] mt-1 ${currentPage === 'feed' ? 'font-semibold' : 'font-medium'}`}>
                Feed
              </span>
              {currentPage === 'feed' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </button>

            {/* Assignments (for students/instructors) or Admin Panel (for admins) */}
            {user.role === 'admin' ? (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('admin')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'admin'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <Shield className={`h-6 w-6 ${currentPage === 'admin' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                <span className={`text-[11px] mt-1 ${currentPage === 'admin' ? 'font-semibold' : 'font-medium'}`}>
                  Admin
                </span>
                {currentPage === 'admin' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate('recipes')
                }}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                  currentPage === 'recipes'
                    ? 'text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                }`}
                type="button"
              >
                <div className="relative">
                  <FileText className={`h-6 w-6 ${currentPage === 'recipes' ? 'scale-110' : ''} transition-transform duration-200`} />
                </div>
                <span className={`text-[11px] mt-1 ${currentPage === 'recipes' ? 'font-semibold' : 'font-medium'}`}>
                  Assignments
                </span>
                {currentPage === 'recipes' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </button>
            )}

            
            {/* Create Post Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCreatePost?.()
              }}
              className="flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative"
              type="button"
            >
              <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center shadow-lg -mt-6">
                <Plus className="h-6 w-6 text-white" />
              </div>
            </button>
            
            {/* Forum */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onNavigate('forum')
              }}
              className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200 touch-target relative ${
                currentPage === 'forum'
                  ? 'text-primary'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              }`}
              type="button"
            >
              <div className="relative">
                <MessageSquare className={`h-6 w-6 ${currentPage === 'forum' ? 'scale-110' : ''} transition-transform duration-200`} />
              </div>
              <span className={`text-[11px] mt-1 ${currentPage === 'forum' ? 'font-semibold' : 'font-medium'}`}>
                Forum
              </span>
              {currentPage === 'forum' && (
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
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 touch-target relative profile-menu-container ${
                isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning'
                  ? 'text-primary'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              }`}
              type="button"
            >
              <div className="relative">
                <Menu className={`h-6 w-6 ${(isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') ? 'scale-110' : ''} transition-transform duration-200`} />
              </div>
              <span className={`text-[11px] mt-1 ${(isProfileMenuOpen || currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') ? 'font-semibold' : 'font-medium'}`}>
                Menu
              </span>
              {(currentPage === 'account' || currentPage === 'profile' || currentPage === 'learning') && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </button>
          </div>
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


      <div
        className={`hidden lg:block fixed left-4 top-4 bottom-4 sidebar-gradient shadow-2xl transition-all duration-300 z-30 rounded-2xl ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </div>
    </>
  )
}
