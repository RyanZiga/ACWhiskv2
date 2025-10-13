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

  // Get user's display name and avatar
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