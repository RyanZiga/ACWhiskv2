import React, { useState } from 'react'
import { X, Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { projectId } from '../utils/supabase/info'

interface ChangePasswordModalProps {
  user: any
  onClose: () => void
  onSuccess: () => void
  isForced?: boolean
}

export function ChangePasswordModal({ user, onClose, onSuccess, isForced = false }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)


  const validatePassword = (password: string) => {
    const minLength = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    
    return {
      isValid: minLength && hasUpperCase && hasNumber,
      minLength,
      hasUpperCase,
      hasNumber
    }
  }

  const passwordValidation = validatePassword(newPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)


    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }


    if (!passwordValidation.isValid) {
      setError('Password does not meet the requirements')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/change-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newPassword }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          if (!isForced) {
            onClose()
          }
        }, 1500)
      } else {
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred while changing your password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="post-card max-w-md w-full max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Lock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isForced ? 'Set New Password' : 'Change Password'}
              </h2>
              {isForced && (
                <p className="text-sm text-muted-foreground mt-1">
                  You must change your temporary password to continue
                </p>
              )}
            </div>
          </div>
          {!isForced && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>


        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isForced && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    For security reasons, you need to change your temporary password before accessing your account.
                  </p>
                </div>
              </div>
            </div>
          )}


          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-clean w-full px-4 py-3 pr-12"
                placeholder="Enter new password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>


          {newPassword && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Password must contain:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  {passwordValidation.minLength ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={passwordValidation.minLength ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {passwordValidation.hasUpperCase ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={passwordValidation.hasUpperCase ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {passwordValidation.hasNumber ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={passwordValidation.hasNumber ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}>
                    One number
                  </span>
                </div>
              </div>
            </div>
          )}


          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-clean w-full px-4 py-3 pr-12"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive mt-2">Passwords do not match</p>
            )}
          </div>


          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}


          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Password changed successfully! {isForced && 'Redirecting...'}
                </p>
              </div>
            </div>
          )}


          <div className="flex gap-3 pt-2">
            {!isForced && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all duration-200 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
              className={`${isForced ? 'w-full' : 'flex-1'} px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  {isForced ? 'Set New Password' : 'Change Password'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
