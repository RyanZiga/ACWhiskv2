import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface HealthStatus {
  isHealthy: boolean
  message: string
  timestamp?: string
  error?: string
}

export function DebugPanel() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkHealth = async () => {
    setLoading(true)
    try {
      console.log('🔍 Testing health endpoint...')
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Health check successful:', data)
        setHealthStatus({
          isHealthy: true,
          message: data.server || 'Server is healthy',
          timestamp: data.timestamp
        })
      } else {
        console.error('❌ Health check failed:', response.status, response.statusText)
        setHealthStatus({
          isHealthy: false,
          message: `Health check failed: ${response.status} ${response.statusText}`,
          error: `HTTP ${response.status}`
        })
      }
    } catch (error) {
      console.error('❌ Health check error:', error)
      setHealthStatus({
        isHealthy: false,
        message: 'Failed to connect to server',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Server Status</h3>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {healthStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {healthStatus.isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              healthStatus.isHealthy ? 'text-green-700' : 'text-red-700'
            }`}>
              {healthStatus.isHealthy ? 'Healthy' : 'Error'}
            </span>
          </div>
          
          <p className="text-xs text-gray-600">
            {healthStatus.message}
          </p>
          
          {healthStatus.timestamp && (
            <p className="text-xs text-gray-500">
              Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
            </p>
          )}
          
          {healthStatus.error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {healthStatus.error}
            </p>
          )}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Project: {projectId}
        </p>
      </div>
    </div>
  )
}