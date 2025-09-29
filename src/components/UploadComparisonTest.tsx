import React, { useState } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface UploadComparisonTestProps {
  user: User
}

export function UploadComparisonTest({ user }: UploadComparisonTestProps) {
  const [results, setResults] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  const testUpload = async (endpoint: 'posts' | 'submissions', bucketName?: string) => {
    const key = bucketName || endpoint
    setLoading(prev => ({ ...prev, [key]: true }))
    setResults(prev => ({ ...prev, [key]: 'Testing...' }))

    try {
      // Create a tiny test file
      const testContent = `Test upload to ${endpoint} at ${new Date().toISOString()}`
      const testFile = new Blob([testContent], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', testFile, `test-${endpoint}-${Date.now()}.txt`)

      const url = bucketName 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/upload/${bucketName}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/${endpoint}/upload`

      console.log(`🧪 Testing upload to: ${url}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: formData
      })

      console.log(`📊 Response for ${key}:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (response.ok) {
        const data = await response.json()
        setResults(prev => ({ ...prev, [key]: `✅ Success: ${JSON.stringify(data, null, 2)}` }))
      } else {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        setResults(prev => ({ ...prev, [key]: `❌ Failed (${response.status}): ${errorData.error || errorText}` }))
      }
    } catch (error) {
      console.error(`Upload test error for ${key}:`, error)
      setResults(prev => ({ ...prev, [key]: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">🔄 Upload Endpoint Comparison Test</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <h4 className="font-medium text-green-700">Feed Upload Endpoints (Working)</h4>
          <button
            onClick={() => testUpload('posts', 'posts')}
            disabled={loading.posts}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading.posts ? 'Testing...' : 'Test Feed/Posts Upload'}
          </button>
          <button
            onClick={() => testUpload('posts', 'avatars')}
            disabled={loading.avatars}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading.avatars ? 'Testing...' : 'Test Profile/Avatar Upload'}
          </button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-red-700">Assignment Upload Endpoint (Issues)</h4>
          <button
            onClick={() => testUpload('submissions')}
            disabled={loading.submissions}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading.submissions ? 'Testing...' : 'Test Assignment/Submission Upload'}
          </button>
          <button
            onClick={() => testUpload('posts', 'submissions')}
            disabled={loading.bucket_submissions}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading.bucket_submissions ? 'Testing...' : 'Test Submissions Bucket (Generic)'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Results:</h4>
        
        {Object.entries(results).map(([key, result]) => (
          <div key={key} className="p-3 bg-gray-100 rounded-lg">
            <div className="font-medium text-sm text-gray-700 mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)} Upload:
            </div>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
              {result}
            </pre>
          </div>
        ))}
        
        {Object.keys(results).length === 0 && (
          <div className="p-3 bg-gray-100 rounded-lg text-gray-500 text-center">
            Click the buttons above to test different upload endpoints
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">What This Tests:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Feed/Posts:</strong> Uses <code>/upload/posts</code> endpoint (generic bucket upload)</li>
          <li><strong>Profile/Avatar:</strong> Uses <code>/upload/avatars</code> endpoint (generic bucket upload)</li>
          <li><strong>Assignment/Submission:</strong> Uses <code>/submissions/upload</code> endpoint (specific submission upload)</li>
          <li><strong>Submissions Bucket (Generic):</strong> Uses <code>/upload/submissions</code> endpoint (tests if bucket access works)</li>
        </ul>
        <p className="text-sm text-blue-600 mt-2">
          This will help identify if the issue is with the specific submission endpoint logic or general bucket permissions.
        </p>
      </div>
    </div>
  )
}