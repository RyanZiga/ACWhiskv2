import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'
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
  const [isMinimized, setIsMinimized] = useState(false)

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
    <div className={`fixed right-4 bg-white dark:bg-card rounded-lg shadow-lg border border-border transition-all duration-300 z-50 ${
      isMinimized 
        ? 'bottom-20 lg:bottom-4 p-2' 
        : 'bottom-20 lg:bottom-4 p-4 max-w-sm'
    }`}>
      <div className={`flex items-center justify-between ${isMinimized ? '' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          {isMinimized && healthStatus && (
            <>
              {healthStatus.isHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </>
          )}
          {!isMinimized && (
            <h3 className="font-semibold text-foreground">Server Status</h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button
              onClick={checkHealth}
              disabled={loading}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      
      {!isMinimized && healthStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {healthStatus.isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              healthStatus.isHealthy ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {healthStatus.isHealthy ? 'Healthy' : 'Error'}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {healthStatus.message}
          </p>
          
          {healthStatus.timestamp && (
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
            </p>
          )}
          
          {healthStatus.error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {healthStatus.error}
            </p>
          )}
        </div>
      )}
      
      {!isMinimized && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Project: {projectId}
          </p>
        </div>
      )}
    </div>
  )
}