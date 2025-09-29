import React, { useState } from 'react'
import { supabase } from '../utils/supabase/client'

export function AuthTest() {
  const [status, setStatus] = useState<string>('Ready to test')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    
    try {
      // Test basic Supabase connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setStatus(`❌ Connection error: ${error.message}`)
      } else {
        setStatus('✅ Supabase connection successful')
        console.log('Session data:', data)
      }
    } catch (err) {
      setStatus(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testSignup = async () => {
    setLoading(true)
    setStatus('Testing signup...')
    
    try {
      const testEmail = `test${Date.now()}@example.com`
      const testPassword = 'testpass123'
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })
      
      if (error) {
        setStatus(`❌ Signup test error: ${error.message}`)
      } else {
        setStatus(`✅ Signup test successful (check email confirmation)`)
        console.log('Signup data:', data)
      }
    } catch (err) {
      setStatus(`❌ Signup test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Supabase Auth Test</h3>
      
      <div className="space-y-4">
        <div className="p-3 bg-gray-100 rounded">
          <strong>Status:</strong> {status}
        </div>
        
        <div className="space-y-2">
          <button
            onClick={testConnection}
            disabled={loading}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            onClick={testSignup}
            disabled={loading}
            className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Signup (Safe)'}
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Note:</strong> These tests help verify Supabase is configured correctly.</p>
          <p>Check browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  )
}