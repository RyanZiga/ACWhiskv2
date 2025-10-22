import React, { useState, useEffect, createContext, useContext } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopHeader } from './components/TopHeader'
import { Landing } from './components/Landing'
import { Dashboard } from './components/Dashboard'
import { RecipeDetail } from './components/RecipeDetail'
import { Recipes } from './components/Recipes'
import { Profile } from './components/Profile'
import { Portfolio } from './components/Portfolio'
import { LearningHub } from './components/LearningHub'
import { AdminPanel } from './components/AdminPanel'
import { AdminDashboard } from './components/AdminDashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Search } from './components/Search'
import { ChatBot } from './components/ChatBot'
import { Feed } from './components/Feed'
import { Account } from './components/Account'
import { MessagesRefactored } from './components/MessagesRefactored'
import { DebugPanel } from './components/DebugPanel'
import { Notifications } from './components/Notifications'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthService, User, AuthResult, Permissions, isValidUUID } from './utils/auth'
import { projectId } from './utils/supabase/info'

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
  const [currentPortfolioUserId, setCurrentPortfolioUserId] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const createPostRef = React.useRef<(() => void) | null>(null)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const result = await AuthService.checkSession()
      if (result.success && result.user) {
        setUser(result.user)

        setCurrentPage(result.user.role === 'admin' ? 'admin' : 'feed')
      }
    } catch (error) {
      console.error('❌ Session check error:', error)

    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const result = await AuthService.login(email, password)
      if (result.success && result.user) {
        setUser(result.user)

        setCurrentPage(result.user.role === 'admin' ? 'admin' : 'feed')
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

        setCurrentPage(result.user.role === 'admin' ? 'admin' : 'feed')
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

      if (isValidUUID(id)) {
        setCurrentUserId(id)
      } else {
        console.error('Invalid user ID provided for account navigation:', id)
        setCurrentUserId(null)
      }
    } else if (page === 'account' && !id) {

      setCurrentUserId(null)
    }
    if (page === 'portfolio') {
      if (id) {

        if (isValidUUID(id)) {
          setCurrentPortfolioUserId(id)
        } else {
          console.error('Invalid user ID provided for portfolio navigation:', id)
          setCurrentPortfolioUserId(null)
        }
      } else {

        setCurrentPortfolioUserId(user?.id || null)
      }
    }
    if (page === 'messages' && id && id.startsWith('user:')) {
      const targetId = id.replace('user:', '')
      if (isValidUUID(targetId)) {
        setTargetUserId(targetId)
      } else {
        console.error('Invalid target user ID for messages:', targetId)
        setTargetUserId(null)
      }
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
            <div className="w-16 h-16 border-4 border-transparent bg-gradient-to-r from-red-600 via-red-500 to-blue-500 rounded-full animate-spin mx-auto mb-4 relative">
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
                onCollapseChange={setIsSidebarCollapsed}
                onCreatePost={() => createPostRef.current?.()}
              />
              <TopHeader 
                user={user}
                currentPage={currentPage}
                onNavigate={navigateTo}
                onLogout={logout}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            </>
          )}
          
          <main className={user ? `transition-all duration-300 pb-24 lg:pb-0 pt-0 ${isSidebarCollapsed ? 'lg:ml-[5.5rem]' : 'lg:ml-[18rem]'}` : ''}>
            {currentPage === 'landing' && (
              <Landing onNavigate={navigateTo} />
            )}
            
            {currentPage === 'feed' && user && (
              <div className="pt-0">
                <Feed user={user} onNavigate={navigateTo} unreadMessagesCount={unreadMessagesCount} onCreatePostRef={createPostRef} />
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
                {(() => {
                  const targetUserId = currentUserId || user.id
                  if (!isValidUUID(targetUserId)) {
                    console.error('Invalid user ID for account page:', targetUserId)
                    return (
                      <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-4">Invalid user profile</p>
                          <button
                            onClick={() => navigateTo('profile')}
                            className="btn-gradient px-4 py-2 rounded-lg"
                          >
                            Go to My Profile
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <Account 
                      userId={targetUserId} 
                      currentUser={user} 
                      onNavigate={navigateTo} 
                    />
                  )
                })()}
              </div>
            )}
            
            {currentPage === 'portfolio' && user && (
              <div className="pt-0">
                <Portfolio 
                  key={currentPortfolioUserId || user.id}
                  user={user} 
                  userId={currentPortfolioUserId || undefined}
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
                  <AdminDashboard user={user} onNavigate={navigateTo} />
                  <DebugPanel />
                </ProtectedRoute>
              </div>
            )}
            
            {currentPage === 'user-management' && user && (
              <div className="pt-0">
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel user={user} onNavigate={navigateTo} />
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
                <MessagesRefactored 
                  user={user} 
                  onNavigate={navigateTo}
                  onUnreadCountChange={setUnreadMessagesCount}
                  targetUserId={targetUserId && isValidUUID(targetUserId) ? targetUserId : null}
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
