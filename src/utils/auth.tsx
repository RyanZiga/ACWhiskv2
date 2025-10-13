import { supabase } from './supabase/client'
import { projectId, publicAnonKey } from './supabase/info'

export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin' | null
  status?: 'active' | 'suspended' | 'banned'
  access_token?: string
  created_at?: string
  last_login?: string
  bio?: string
  location?: string
  skills?: string[]
  avatar_url?: string
  followers?: string[]
  following?: string[]
  needs_onboarding?: boolean
  privacy_settings?: {
    profile_visible: boolean
    posts_visible: boolean
    photos_visible: boolean
  }
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: User
}

// Role-based permissions
export const Permissions = {
  // Student permissions
  student: {
    canCreateRecipes: true,
    canJoinForum: true,
    canAccessLearning: true,
    canCreatePosts: true,
    canMessage: true,
    canViewProfiles: true,
    canManageOwnContent: true
  },
  
  // Instructor permissions (includes all student permissions + additional)
  instructor: {
    canCreateRecipes: true,
    canJoinForum: true,
    canAccessLearning: true,
    canCreatePosts: true,
    canMessage: true,
    canViewProfiles: true,
    canManageOwnContent: true,
    canCreateCourses: true,
    canModerateContent: true,
    canAccessInstructorTools: true,
    canReviewPortfolios: true,
    canGradeStudents: true
  },
  
  // Admin permissions (includes all permissions + system management)
  admin: {
    canCreateRecipes: true,
    canJoinForum: true,
    canAccessLearning: true,
    canCreatePosts: true,
    canMessage: true,
    canViewProfiles: true,
    canManageOwnContent: true,
    canCreateCourses: true,
    canModerateContent: true,
    canAccessInstructorTools: true,
    canReviewPortfolios: true,
    canGradeStudents: true,
    canAccessAdminPanel: true,
    canManageUsers: true,
    canViewSystemStats: true,
    canManageSettings: true,
    canDeleteAnyContent: true,
    canBanUsers: true
  }
}

// UUID validation utility
export const isValidUUID = (uuid: string | null | undefined): boolean => {
  if (!uuid || typeof uuid !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export class AuthService {
  static supabase = supabase
  // Check if user has specific permission
  static hasPermission(user: User | null, permission: keyof typeof Permissions.admin): boolean {
    if (!user || !user.role) return false
    
    const userPermissions = Permissions[user.role]
    return userPermissions && (userPermissions as any)[permission] === true
  }

  // Get user role display name
  static getRoleDisplayName(role: string): string {
    const roleNames = {
      student: 'Student',
      instructor: 'Instructor', 
      admin: 'Administrator'
    }
    return roleNames[role as keyof typeof roleNames] || 'Unknown'
  }

  // Get role badge color
  static getRoleBadgeColor(role: string): string {
    const colors = {
      student: 'bg-blue-100 text-blue-800',
      instructor: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Check if user can access a specific page
  static canAccessPage(user: User | null, page: string): boolean {
    if (!user) return false
    if (user.needs_onboarding) return false // Restrict access during onboarding
    
    switch (page) {
      case 'admin':
        return this.hasPermission(user, 'canAccessAdminPanel')
      case 'instructor-tools':
        return this.hasPermission(user, 'canAccessInstructorTools')
      default:
        return true // Most pages are accessible to all authenticated users
    }
  }

  // Validate role
  static isValidRole(role: string | null): role is 'student' | 'instructor' | 'admin' {
    if (!role) return false
    return ['student', 'instructor', 'admin'].includes(role)
  }

  // Sign up new user
  static async signup(email: string, password: string, name: string, role: string): Promise<AuthResult> {
    try {
      // Validate email domain
      if (!this.validateEmailDomain(email)) {
        return { success: false, error: 'Sorry This app is only exclusive for Asian College Students' }
      }

      // Validate role
      if (!this.isValidRole(role)) {
        return { success: false, error: 'Invalid role specified' }
      }

      console.log('🚀 Starting signup process...')
      
      // Health check first
      try {
        const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        })
        
        if (!healthResponse.ok) {
          console.error('❌ Health check failed:', healthResponse.status)
          return {
            success: false,
            error: `Server not available. Please ensure Edge Functions are deployed.`
          }
        }
      } catch (healthError) {
        console.error('❌ Health check error:', healthError)
        return {
          success: false,
          error: 'Cannot reach server. Please check your connection.'
        }
      }
      
      // Create user via server endpoint
      console.log('📤 Creating user account...')
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name, role })
      })
      
      if (response.ok) {
        console.log('✅ Signup successful, logging in...')
        // Auto-login after successful signup
        return await this.login(email, password)
      } else {
        let errorMessage = 'Signup failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        console.error('❌ Signup failed:', errorMessage)
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('❌ Signup error:', error)
      return { 
        success: false, 
        error: `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  // Login user
  static async login(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Starting login process...')
      
      // Validate email domain before attempting login
      if (!this.validateEmailDomain(email)) {
        return { 
          success: false, 
          error: 'Sorry This app is only exclusive for Asian College Students' 
        }
      }
      
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('❌ Authentication error:', error)
        
        // Provide user-friendly error messages
        let userMessage = error.message
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and click the confirmation link before signing in.'
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait a moment and try again.'
        }
        
        return { success: false, error: userMessage }
      }
      
      if (session?.access_token) {
        console.log('✅ Authentication successful, fetching profile...')
        
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const { profile } = await response.json()
            console.log('✅ Profile loaded successfully')
            
            // Validate user profile data
            if (!isValidUUID(profile.id)) {
              console.error('Invalid user ID in login profile:', profile.id)
              return { success: false, error: 'Invalid user profile data' }
            }
            
            const user: User = {
              ...profile,
              access_token: session.access_token
            }
            
            return { success: true, user }
          } else {
            console.error('❌ Profile fetch failed:', response.status)
            return { 
              success: false, 
              error: `Failed to load user profile (${response.status})` 
            }
          }
        } catch (profileError) {
          console.error('❌ Profile fetch error:', profileError)
          return { 
            success: false, 
            error: 'Network error loading profile. Please try again.' 
          }
        }
      }
      
      return { success: false, error: 'No session received' }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { 
        success: false, 
        error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  // Check existing session
  static async checkSession(): Promise<AuthResult> {
    try {
      console.log('🔍 Checking existing session...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session check error:', error)
        return { success: false, error: error.message }
      }
      
      if (session?.access_token) {
        console.log('✅ Found existing session, fetching profile...')
        
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const { profile } = await response.json()
            console.log('✅ Profile loaded from session')
            
            // Validate user profile data
            if (!isValidUUID(profile.id)) {
              console.error('Invalid user ID in session profile:', profile.id)
              return { success: false, error: 'Invalid user profile data' }
            }
            
            const user: User = {
              ...profile,
              access_token: session.access_token
            }
            
            return { success: true, user }
          } else {
            console.warn('⚠️ Failed to load profile from session')
            return { success: false, error: 'Session expired' }
          }
        } catch (fetchError) {
          console.warn('⚠️ Network error loading profile from session:', fetchError)
          return { success: false, error: 'Network error' }
        }
      } else {
        console.log('ℹ️ No existing session found')
        return { success: false, error: 'No session' }
      }
    } catch (error) {
      console.error('❌ Session check error:', error)
      return { success: false, error: 'Session check failed' }
    }
  }

  // Validate email domain
  static validateEmailDomain(email: string): boolean {
    return email.toLowerCase().endsWith('@asiancollege.edu.ph')
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out...')
      await supabase.auth.signOut()
      console.log('✅ Logout successful')
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }
}