import React from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '../App'
import { AuthService } from '../utils/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'instructor' | 'admin'
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission, 
  fallback 
}: ProtectedRouteProps) {
  const { user } = useAuth()


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access this page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }


  if (requiredRole) {
    const roleHierarchy = {
      'student': 1,
      'instructor': 2,
      'admin': 3
    }

    const userLevel = roleHierarchy[user.role]
    const requiredLevel = roleHierarchy[requiredRole]

    if (userLevel < requiredLevel) {
      return fallback || (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              This area requires {AuthService.getRoleDisplayName(requiredRole)} access.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                Your current role: <span className="font-semibold">{AuthService.getRoleDisplayName(user.role)}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Required role: <span className="font-semibold">{AuthService.getRoleDisplayName(requiredRole)}</span>
              </p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }


  if (requiredPermission) {
    const hasPermission = AuthService.hasPermission(user, requiredPermission as any)
    
    if (!hasPermission) {
      return fallback || (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this feature.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                Your role: <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${AuthService.getRoleBadgeColor(user.role)}`}>{AuthService.getRoleDisplayName(user.role)}</span>
              </p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }


  return <>{children}</>
}

interface RoleBasedComponentProps {
  allowedRoles: ('student' | 'instructor' | 'admin')[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleBasedComponent({ allowedRoles, children, fallback }: RoleBasedComponentProps) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null
  }

  return <>{children}</>
}

interface PermissionBasedComponentProps {
  requiredPermission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionBasedComponent({ requiredPermission, children, fallback }: PermissionBasedComponentProps) {
  const { user } = useAuth()

  if (!user || !AuthService.hasPermission(user, requiredPermission as any)) {
    return fallback || null
  }

  return <>{children}</>
}