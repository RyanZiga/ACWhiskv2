import React, { useState } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'
import { GlassCard, GlassButton } from './ui/glass-card'

interface DebugUserProps {
  user: User
}

export function DebugUser({ user }: DebugUserProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkUserInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/debug/user`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      } else {
        console.error('Debug info fetch failed:', response.status)
      }
    } catch (error) {
      console.error('Debug info error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (newRole: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/debug/user/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Role updated to ${newRole}! Please refresh the page.`)
        setDebugInfo(null)
      } else {
        console.error('Role update failed:', response.status)
      }
    } catch (error) {
      console.error('Role update error:', error)
    }
  }

  return (
    <GlassCard className="p-6 m-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Debug User Info</h3>
      
      <div className="flex gap-2 mb-4">
        <GlassButton onClick={checkUserInfo} disabled={loading}>
          {loading ? 'Loading...' : 'Check User Info'}
        </GlassButton>
        
        <GlassButton onClick={() => updateUserRole('instructor')} variant="secondary">
          Make Instructor
        </GlassButton>
        
        <GlassButton onClick={() => updateUserRole('student')} variant="secondary">
          Make Student
        </GlassButton>
      </div>

      {debugInfo && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Auth User:</h4>
          <pre className="text-sm mb-4">{JSON.stringify(debugInfo.authUser, null, 2)}</pre>
          
          <h4 className="font-semibold mb-2">Profile Data:</h4>
          <pre className="text-sm">{JSON.stringify(debugInfo.profileData, null, 2)}</pre>
        </div>
      )}
    </GlassCard>
  )
}