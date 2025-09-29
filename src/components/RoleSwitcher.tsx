import React, { useState } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface RoleSwitcherProps {
  user: User
  onRoleUpdated?: () => void
}

export function RoleSwitcher({ user, onRoleUpdated }: RoleSwitcherProps) {
  const [newRole, setNewRole] = useState<'student' | 'instructor' | 'admin'>(user.role)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<string>('')

  const updateRole = async () => {
    setUpdating(true)
    setMessage('')

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/debug/user/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(`✅ Role updated to ${newRole}. Please refresh the page or log out/in.`)
        if (onRoleUpdated) onRoleUpdated()
      } else {
        const errorData = await response.json()
        setMessage(`❌ Failed to update role: ${errorData.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border-2 border-orange-200">
      <h4 className="font-semibold text-orange-700 mb-3">⚠️ Temporary Role Switcher (Testing Only)</h4>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Role: <span className="font-semibold text-blue-600">{user.role}</span>
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'student' | 'instructor' | 'admin')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={updating}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={updateRole}
          disabled={updating || newRole === user.role}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? 'Updating...' : `Update Role to ${newRole}`}
        </button>

        {message && (
          <div className={`p-2 rounded text-sm ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="text-xs text-gray-600">
          <strong>Note:</strong> This temporarily changes your role for testing. 
          After changing roles, test the upload functionality to see if that resolves the issue.
          You may need to refresh the page for changes to take effect.
        </div>
      </div>
    </div>
  )
}