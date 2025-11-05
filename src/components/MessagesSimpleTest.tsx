import React, { useState, useEffect } from 'react'
import { User } from '../utils/auth'
import { projectId } from '../utils/supabase/info'

interface MessagesSimpleTestProps {
  user: User
}

export function MessagesSimpleTest({ user }: MessagesSimpleTestProps) {
  const [status, setStatus] = useState('Testing...')
  const [projectInfo, setProjectInfo] = useState('')

  useEffect(() => {
    setProjectInfo(`Project ID: ${projectId}`)
    
    const testConnection = async () => {
      try {
        setStatus('Testing connection...')
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/profile`, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          setStatus('✅ Connection successful!')
        } else {
          setStatus(`❌ Connection failed: ${response.status}`)
        }
      } catch (error) {
        setStatus(`❌ Error: ${error.message}`)
      }
    }

    if (user.access_token) {
      testConnection()
    } else {
      setStatus('❌ No access token')
    }
  }, [user])

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Messages Connection Test</h2>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{projectInfo}</p>
        <p className="text-sm">{status}</p>
      </div>
    </div>
  )
}