import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

// Create a single Supabase client instance to avoid multiple client warnings
const supabaseUrl = `https://${projectId}.supabase.co`

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'acwhisk-auth-v2', // Unique key to avoid conflicts
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'acwhisk-web-app'
    }
  },
  db: {
    schema: 'public'
  }
})

// Helper function to get authenticated client - REUSE the main client with session
export const getAuthenticatedClient = (): SupabaseClient => {
  return supabase
}

export default supabase