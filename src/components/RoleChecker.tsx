import React, { useState } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface RoleCheckerProps {
  user: User
}

export function RoleChecker({ user }: RoleCheckerProps) {
  const [roleInfo, setRoleInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const checkRole = async () => {
    setLoading(true)
    setError('')
    setRoleInfo(null)

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/check-role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRoleInfo(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to check role')
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testSubmissionUpload = async () => {
    setLoading(true)
    setError('')

    try {
      // Create a tiny test file
      const testFile = new Blob(['test'], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', testFile, 'test.txt')

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/submissions/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        alert('✅ Submission upload test successful!')
        console.log('Upload result:', data)
      } else {
        const errorData = await response.json()
        setError(`❌ Submission upload failed: ${errorData.error}`)
      }
    } catch (err) {
      setError(`❌ Upload test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">🔍 Role & Upload Debugger</h3>
      
      <div className="space-y-4">
        <div className="p-3 bg-gray-100 rounded">
          <strong>Current User Info:</strong>
          <div className="mt-2 text-sm">
            <div>ID: {user.id}</div>
            <div>Email: {user.email}</div>
            <div>Name: {user.name}</div>
            <div>Frontend Role: {user.role}</div>
          </div>
        </div>

        {roleInfo && (
          <div className="p-3 bg-green-100 rounded">
            <strong>✅ Backend Role Info:</strong>
            <div className="mt-2 text-sm">
              <div>User ID: {roleInfo.user_id}</div>
              <div>Email: {roleInfo.email}</div>
              <div>Backend Role: <span className="font-semibold">{roleInfo.role}</span></div>
              <div>Name: {roleInfo.name}</div>
              <div>Auth Metadata Role: {roleInfo.auth_metadata_role}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 rounded text-red-700">
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={checkRole}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Backend Role'}
          </button>

          <button
            onClick={testSubmissionUpload}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Submission Upload'}
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>How this works:</strong></p>
          <ul className="list-disc ml-4 mt-1">
            <li><strong>Check Backend Role:</strong> Shows what role the server thinks you have</li>
            <li><strong>Test Submission Upload:</strong> Tries to upload a test file to assignments</li>
            <li>If roles don't match, there's a data sync issue</li>
            <li>If upload fails with role error, the role restrictions are working</li>
          </ul>
        </div>
      </div>
    </div>
  )
}