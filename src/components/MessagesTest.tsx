import React, { useState } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface MessagesTestProps {
  user: User
}

export function MessagesTest({ user }: MessagesTestProps) {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testEndpoint = async (endpoint: string, method = 'GET', body?: any) => {
    try {
      setLoading(true)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      })

      const data = await response.json()
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          data: data
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          error: error.message
        }
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Messages API Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={() => testEndpoint('/conversations')}
          disabled={loading}
          className="btn-gradient px-4 py-2 rounded-lg mr-4"
        >
          Test Get Conversations
        </button>
        
        <button
          onClick={() => testEndpoint('/search/users?q=test')}
          disabled={loading}
          className="btn-gradient px-4 py-2 rounded-lg mr-4"
        >
          Test Search Users
        </button>
        
        <button
          onClick={() => testEndpoint('/profile')}
          disabled={loading}
          className="btn-gradient px-4 py-2 rounded-lg mr-4"
        >
          Test Get Profile
        </button>
      </div>

      {loading && (
        <div className="mt-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Test Results:</h3>
        <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  )
}