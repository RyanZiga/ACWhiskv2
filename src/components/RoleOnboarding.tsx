import React, { useState } from 'react'
import { ChevronDown, CheckCircle, Info } from 'lucide-react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface RoleOnboardingProps {
  user: User
  onComplete: (role: string) => void
}

export function RoleOnboarding({ user, onComplete }: RoleOnboardingProps) {
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: selectedRole,
          onboarding_completed: true
        })
      })

      if (response.ok) {
        onComplete(selectedRole)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save role' }))
        setError(errorData.error || 'Failed to save your role. Please try again.')
      }
    } catch (error) {
      console.error('Role selection error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get user's display name and avatar from Google profile
  const displayName = user.name || user.email?.split('@')[0] || 'User'
  const profilePicture = user.avatar_url

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Beautiful sage green background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 animate-pulse blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 animate-pulse blur-3xl" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 to-accent/8 animate-pulse blur-3xl" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {/* Main Card */}
          <div className="post-card p-8 shadow-xl transform hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl backdrop-blur-sm border border-border/50">
            
            {/* Welcome Header */}
            <div className="text-center mb-8">
              {/* Google Branding */}
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-red-50 px-4 py-2 rounded-full mb-6 border border-blue-100 dark:from-blue-950/30 dark:to-red-950/30 dark:border-blue-800/30">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connected with Google</span>
              </div>

              {/* User Profile */}
              <div className="mb-6">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={displayName}
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-primary/20 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 avatar-gradient flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Welcome, {displayName}!
                </h1>
                <p className="text-muted-foreground">
                  Complete your profile to get started with ACWhisk
                </p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-foreground font-medium mb-4">
                  Choose your role
                </label>
                
                {/* Role Options */}
                <div className="space-y-3">
                  {/* Student Option */}
                  <div 
                    onClick={() => setSelectedRole('student')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedRole === 'student'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedRole === 'student' 
                            ? 'border-primary bg-primary' 
                            : 'border-gray-300'
                        }`}>
                          {selectedRole === 'student' && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">Student</h3>
                          <p className="text-sm text-muted-foreground">
                            Access recipes, assignments, and learning resources
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Instructor Option */}
                  <div 
                    onClick={() => setSelectedRole('instructor')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedRole === 'instructor'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedRole === 'instructor' 
                            ? 'border-primary bg-primary' 
                            : 'border-gray-300'
                        }`}>
                          {selectedRole === 'instructor' && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">Instructor</h3>
                          <p className="text-sm text-muted-foreground">
                            Create assignments, review submissions, and manage courses
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Info Note */}
                <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Admin roles</strong> are assigned by the system administrator
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={handleRoleSelection}
                disabled={loading || !selectedRole}
                className="w-full btn-gradient px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Setting up your profile...</span>
                  </>
                ) : (
                  <span>Continue to ACWhisk</span>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              You can update your role later in your profile settings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
