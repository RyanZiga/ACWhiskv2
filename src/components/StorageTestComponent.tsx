import React, { useState } from 'react'
import { User } from '../utils/auth'
import { getAuthenticatedClient } from '../utils/supabase/client'

interface StorageTestProps {
  user: User
}

export function StorageTestComponent({ user }: StorageTestProps) {
  const [status, setStatus] = useState<string>('Ready to test storage')
  const [loading, setLoading] = useState(false)

  const testStorageUpload = async (bucketName: string) => {
    setLoading(true)
    setStatus(`Testing upload to ${bucketName}...`)

    try {

      const supabase = getAuthenticatedClient(user.access_token!)


      const testContent = `Test file uploaded at ${new Date().toISOString()}`
      const testFile = new Blob([testContent], { type: 'text/plain' })
      const fileName = `${user.id}/test-${Date.now()}.txt`

      console.log(`Uploading to bucket: ${bucketName}, file: ${fileName}`)


      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, testFile, {
          contentType: 'text/plain',
          upsert: true
        })

      if (error) {
        console.error('Storage upload error:', error)
        setStatus(`❌ Upload failed to ${bucketName}: ${error.message}`)
        return
      }

      console.log('Upload successful:', data)
      setStatus(`✅ Upload successful to ${bucketName}!`)


      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60)

      if (urlError) {
        console.error('Signed URL error:', urlError)
        setStatus(`✅ Upload OK, ❌ Signed URL failed: ${urlError.message}`)
      } else {
        console.log('Signed URL created:', urlData.signedUrl)
        setStatus(`✅ Upload & Signed URL successful for ${bucketName}!`)
      }

    } catch (error) {
      console.error('Test error:', error)
      setStatus(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const listBuckets = async () => {
    setLoading(true)
    setStatus('Listing available buckets...')

    try {
      const supabase = getAuthenticatedClient(user.access_token!)
      
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        setStatus(`❌ Failed to list buckets: ${error.message}`)
        return
      }

      console.log('Available buckets:', data)
      const acwhiskBuckets = data.filter(bucket => bucket.name.includes('make-c56dfc7a'))
      setStatus(`✅ Found ${acwhiskBuckets.length} ACWhisk buckets: ${acwhiskBuckets.map(b => b.name).join(', ')}`)
      
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testBuckets = [
    'make-c56dfc7a-posts',
    'make-c56dfc7a-submissions', 
    'make-c56dfc7a-avatars',
    'make-c56dfc7a-recipes'
  ]

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">🗄️ Storage RLS Policy Tester</h3>
      
      <div className="space-y-4">
        <div className="p-3 bg-gray-100 rounded">
          <strong>Status:</strong> {status}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={listBuckets}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'List Buckets'}
          </button>

          {testBuckets.map(bucket => (
            <button
              key={bucket}
              onClick={() => testStorageUpload(bucket)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              {loading ? 'Testing...' : `Test ${bucket.replace('make-c56dfc7a-', '')}`}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <div>
            <strong>How to use:</strong>
            <ol className="list-decimal ml-4 mt-1">
              <li>First run the SQL commands from <code>/COMPLETE_RLS_FIX.sql</code> in your Supabase dashboard</li>
              <li>Click "List Buckets" to see available storage buckets</li>
              <li>Test each bucket to see which ones have proper RLS policies</li>
              <li>Check browser console for detailed error messages</li>
            </ol>
          </div>
          
          <div>
            <strong>Expected Results:</strong>
            <ul className="list-disc ml-4 mt-1">
              <li><strong>posts, avatars, recipes:</strong> Should work (public buckets)</li>
              <li><strong>submissions:</strong> Should work (restricted but you have access)</li>
              <li>If any fail, the RLS policies need to be set up</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-yellow-100 rounded text-yellow-800">
          <strong>⚠️ Important:</strong> This creates test files in storage. Delete them after testing or they'll accumulate.
        </div>
      </div>
    </div>
  )
}