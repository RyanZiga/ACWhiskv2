import React, { useState, useEffect, createContext, useContext } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopHeader } from './components/TopHeader'
import { Landing } from './components/Landing'
import { Dashboard } from './components/Dashboard'
import { RecipeDetail } from './components/RecipeDetail'
import { Recipes } from './components/Recipes'
import { Profile } from './components/Profile'
import { Forum } from './components/Forum'
import { ForumPost } from './components/ForumPost'
import { LearningHub } from './components/LearningHub'
import { AdminPanel } from './components/AdminPanel'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Search } from './components/Search'
import ChatBot from './components/ChatBot'
import { Feed } from './components/Feed'
import { Account } from './components/Account'
import { Messages } from './components/Messages'
import { DebugPanel } from './components/DebugPanel'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthService, User, AuthResult, Permissions } from './utils/auth'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signup: (email: string, password: string, name: string, role: string) => Promise<{ success: boolean, error?: string }>
  logout: () => Promise<void>
  loading: boolean
  hasPermission: (permission: keyof typeof Permissions.admin) => boolean
  canAccessPage: (page: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('landing')
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null)
  const [currentPostId, setCurrentPostId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const result = await AuthService.checkSession()
      if (result.success && result.user) {
        setUser(result.user)
        setCurrentPage('feed')
      }
    } catch (error) {
      console.error('❌ Session check error:', error)
      // Don't show user errors for session check failures
      // Just proceed with unauthenticated state
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const result = await AuthService.login(email, password)
      if (result.success && result.user) {
        setUser(result.user)
        setCurrentPage('feed')
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { 
        success: false, 
        error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  const signup = async (email: string, password: string, name: string, role: string) => {
    try {
      const result = await AuthService.signup(email, password, name, role)
      if (result.success && result.user) {
        setUser(result.user)
        setCurrentPage('feed')
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Signup error:', error)
      return { 
        success: false, 
        error: `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  const logout = async () => {
    await AuthService.logout()
    setUser(null)
    setCurrentPage('landing')
  }

  const hasPermission = (permission: keyof typeof Permissions.admin): boolean => {
    return AuthService.hasPermission(user, permission)
  }

  const canAccessPage = (page: string): boolean => {
    return AuthService.canAccessPage(user, page)
  }

  const navigateTo = (page: string, id?: string) => {
    setCurrentPage(page)
    if (page === 'recipe' && id) {
      setCurrentRecipeId(id)
    }
    if (page === 'post' && id) {
      setCurrentPostId(id)
    }
    if (page === 'account' && id) {
      setCurrentUserId(id)
    }
    if (page === 'messages' && id && id.startsWith('user:')) {
      setTargetUserId(id.replace('user:', ''))
    } else if (page === 'messages' && !id) {
      setTargetUserId(null)
    }
  }

  const authValue: AuthContextType = {
    user,
    login,
    signup,
    logout,
    loading,
    hasPermission,
    canAccessPage
  }

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full animate-spin mx-auto mb-4 relative">
              <div className="absolute inset-2 bg-background rounded-full"></div>
            </div>
            <p className="text-muted-foreground">Loading ACWhisk...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-background">
          {user && (
            <>
              <Sidebar 
                user={user} 
                currentPage={currentPage} 
                onNavigate={navigateTo}
                onLogout={logout}
                unreadMessagesCount={unreadMessagesCount}
              />
              <TopHeader user={user} currentPage={currentPage} onNavigate={navigateTo} onLogout={logout} />
            </>
          )}
          
          <main className={user ? 'lg:ml-80' : ''}>
            {currentPage === 'landing' && (
              <Landing onNavigate={navigateTo} />
            )}
            
            {currentPage === 'feed' && user && (
              <div className="pt-0">
                <Feed user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'dashboard' && user && (
              <div className="pt-0">
                <Dashboard user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'recipe' && currentRecipeId && user && (
              <div className="pt-0">
                <RecipeDetail 
                  recipeId={currentRecipeId} 
                  user={user} 
                  onNavigate={navigateTo} 
                />
              </div>
            )}
            
            {currentPage === 'recipes' && user && (
              <div className="pt-0">
                <Recipes user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'profile' && user && (
              <div className="pt-0">
                <Profile user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'account' && user && (
              <div className="pt-0">
                <Account 
                  userId={currentUserId || user.id} 
                  currentUser={user} 
                  onNavigate={navigateTo} 
                />
              </div>
            )}
            
            {currentPage === 'forum' && user && (
              <div className="pt-0">
                <Forum user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'post' && currentPostId && user && (
              <div className="pt-0">
                <ForumPost 
                  postId={currentPostId} 
                  user={user} 
                  onNavigate={navigateTo} 
                />
              </div>
            )}
            
            {currentPage === 'learning' && user && (
              <div className="pt-0">
                <LearningHub user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'admin' && user && (
              <div className="pt-0">
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel user={user} onNavigate={navigateTo} />
                  <DebugPanel />
                </ProtectedRoute>
              </div>
            )}
            
            {currentPage === 'search' && user && (
              <div className="pt-0">
                <Search user={user} onNavigate={navigateTo} />
              </div>
            )}
            
            {currentPage === 'messages' && user && (
              <div className="pt-0">
                <Messages 
                  user={user} 
                  onNavigate={navigateTo}
                  onUnreadCountChange={setUnreadMessagesCount}
                  targetUserId={targetUserId}
                />
              </div>
            )}
          </main>
          
          {user && <ChatBot />}
        </div>
      </AuthContext.Provider>
    </ThemeProvider>
  )
}

export default App
