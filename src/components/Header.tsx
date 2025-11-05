import React, { useState } from 'react'
import { Search, Menu, X, Bell, LogOut, Settings, User, ChevronDown, Shield, GraduationCap, Crown } from 'lucide-react'
import { Notifications } from './Notifications'
import { UserRoleBadge } from './UserRoleBadge'
import { AuthService } from '../utils/auth'
import logoImage from 'figma:asset/6ca58feaf512431e14a13cc86c72c7775ee404a3.png'

interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin'
}

interface HeaderProps {
  user: User
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export function Header({ user, currentPage, onNavigate, onLogout }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)


  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Feed', id: 'feed' },
      { name: 'Recipes', id: 'dashboard' },
      { name: 'Forum', id: 'forum' },
      { name: 'Learning', id: 'learning' }
    ]


    if (user.role === 'instructor' || user.role === 'admin') {
      baseNavigation.push({ name: 'Instructor Tools', id: 'instructor-tools' })
    }


    if (user.role === 'admin') {
      baseNavigation.push({ name: 'Admin Panel', id: 'admin' })
    }

    return baseNavigation
  }

  const navigation = getNavigationItems()

  const handleLogout = () => {
    setShowProfileMenu(false)
    onLogout()
  }

  const handleProfileNavigation = (page: string) => {
    setShowProfileMenu(false)
    onNavigate(page)
  }

  return (
    <header className="fixed top-0 left-0 right-0 header-gradient z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('feed')}
              className="flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <img 
                  src={logoImage} 
                  alt="Acwhisk Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl text-foreground hidden sm:block group-hover:text-primary transition-colors">
                Acwhisk
              </span>
            </button>
          </div>


          <nav className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 relative ${
                  currentPage === item.id
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.name}
                {currentPage === item.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>


          <div className="flex items-center space-x-3">

            <button
              onClick={() => onNavigate('search')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                currentPage === 'search'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>


            <div className="relative">
              <Notifications user={user} />
            </div>


            <button
              onClick={() => onNavigate('messages')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                currentPage === 'messages'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>


            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 ${
                  currentPage === 'profile' || showProfileMenu
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:block font-medium">{user.name}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>


              {showProfileMenu && (
                <>

                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  

                  <div className="absolute right-0 mt-2 w-64 post-card shadow-xl z-40 overflow-hidden">

                    <div className="p-4 bg-muted border-b border-border">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 capitalize ${
                            user.role === 'instructor' ? 'bg-primary text-primary-foreground' :
                            user.role === 'admin' ? 'bg-accent text-accent-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>


                    <div className="py-2">
                      <button
                        onClick={() => handleProfileNavigation('profile')}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={() => handleProfileNavigation('account')}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Account Settings</span>
                      </button>

                      <div className="border-t border-border my-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>


            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>


        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id)
                    setShowMobileMenu(false)
                  }}
                  className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentPage === item.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </button>
              ))}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={() => {
                    onNavigate('profile')
                    setShowMobileMenu(false)
                  }}
                  className="text-left px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center space-x-3"
                >
                  <User className="h-4 w-4" />
                  <span>Profile Settings</span>
                </button>
                
                <button
                  onClick={() => {
                    handleLogout()
                    setShowMobileMenu(false)
                  }}
                  className="text-left px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors w-full flex items-center space-x-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}