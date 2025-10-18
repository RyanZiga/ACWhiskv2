import React, { useState, useEffect } from 'react'
import { X, Upload, Image, Video, FileText, AlertCircle } from 'lucide-react'
import { GlassCard, GlassButton } from './ui/glass-card'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string
  points: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  instructor_name: string
  status: 'published' | 'draft' | 'closed'
}

interface UploadedFile {
  url: string
  path: string
  type: 'image' | 'video'
  size: number
  name: string
}

interface SubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: Assignment
  user: User
  onSubmissionComplete: () => void
}

export function SubmissionModal({ isOpen, onClose, assignment, user, onSubmissionComplete }: SubmissionModalProps) {
  const [recipeTitle, setRecipeTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const testUploadEndpoint = async () => {
    try {
      console.log('🧪 Testing upload endpoint accessibility...')
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/check-role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      })
      
      const result = await response.json()
      console.log('🧪 Role check result:', result)
      
      if (result.role !== 'student' && result.role !== 'instructor') {
        setError(`Upload may fail: Your role is "${result.role}" but only students and instructors can upload submission files.`)
      }
    } catch (error) {
      console.error('🧪 Endpoint test failed:', error)
      setError('Cannot connect to server. Please check your internet connection.')
    }
  }


  useEffect(() => {
    if (isOpen && user.access_token) {
      testUploadEndpoint()
    }
  }, [isOpen, user.access_token])

  const handleFileUpload = async (files: FileList) => {
    setError(null)
    setUploading(true)

    console.log('🗂️ Starting submission file upload:', {
      fileCount: files.length,
      userRole: user.role,
      hasAccessToken: !!user.access_token
    })


    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'
    ]

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        setError(`File type "${file.type}" not allowed. Please use images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, OGG, AVI, MOV).`)
        setUploading(false)
        return
      }

      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const maxSizeMB = file.type.startsWith('video/') ? '50MB' : '10MB'
        setError(`File "${file.name}" is too large. Maximum size is ${maxSizeMB}.`)
        setUploading(false)
        return
      }
    }

    if (!user.access_token) {
      setError('Authentication token missing. Please log out and log back in.')
      setUploading(false)
      return
    }

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log(`📤 Uploading file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/submissions/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
          body: formData
        })

        console.log(`📤 Upload response for ${file.name}:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || `HTTP ${response.status}` }
          }
          console.error(`❌ Upload failed for ${file.name}:`, errorData)
          throw new Error(errorData.error || `Upload failed with status ${response.status}`)
        }

        const result = await response.json()
        console.log(`✅ Upload successful for ${file.name}:`, result)
        return result
      })

      const results = await Promise.all(uploadPromises)
      setUploadedFiles(prev => [...prev, ...results])
      console.log('✅ All uploads completed successfully')
    } catch (error) {
      console.error('❌ Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!recipeTitle.trim()) {
      setError('Recipe title is required')
      setSubmitting(false)
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      setSubmitting(false)
      return
    }

    try {
      const submissionData = {
        assignment_id: assignment.id,
        recipe_title: recipeTitle,
        description,
        ingredients: ingredients.split('\n').filter(line => line.trim()),
        instructions: instructions.split('\n').filter(line => line.trim()),
        notes,
        images: uploadedFiles.filter(f => f.type === 'image').map(f => ({
          url: f.url,
          path: f.path,
          name: f.name,
          size: f.size
        })),
        videos: uploadedFiles.filter(f => f.type === 'video').map(f => ({
          url: f.url,
          path: f.path,
          name: f.name,
          size: f.size
        }))
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit assignment')
      }


      setRecipeTitle('')
      setDescription('')
      setIngredients('')
      setInstructions('')
      setNotes('')
      setUploadedFiles([])
      
      onSubmissionComplete()
      onClose()
    } catch (error) {
      console.error('Submission error:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit assignment')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="modal-responsive">
        <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Submit Assignment</h2>
                <p className="text-sm text-muted-foreground">{assignment.title}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Assignment Info */}
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Assignment Details</span>
              </div>
              <p className="text-sm text-foreground/80 mb-2">{assignment.description}</p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                <span>Points: {assignment.points}</span>
                <span className="capitalize">Difficulty: {assignment.difficulty}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </div>
            )}


            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg text-xs">
                <div className="font-semibold mb-1 text-foreground">🔧 Debug Info:</div>
                <div className="text-muted-foreground">User Role: {user.role}</div>
                <div className="text-muted-foreground">Has Token: {user.access_token ? '✅ Yes' : '❌ No'}</div>
                <div className="text-muted-foreground">Token Preview: {user.access_token ? `${user.access_token.substring(0, 20)}...` : 'None'}</div>
                <div className="text-muted-foreground">Project ID: {projectId}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipe Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  value={recipeTitle}
                  onChange={(e) => setRecipeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground"
                  placeholder="Enter your recipe title..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground"
                  placeholder="Describe your recipe..."
                  required
                />
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ingredients
                </label>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground"
                  placeholder="List ingredients (one per line)..."
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground"
                  placeholder="List cooking instructions (one per line)..."
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Images & Videos
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    dragActive 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg,video/avi,video/mov"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="file-upload" 
                    className={`cursor-pointer block ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} transition-opacity`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      {uploading ? (
                        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : dragActive ? (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/15 transition-colors">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-base text-foreground font-medium mb-1">
                          {uploading 
                            ? `Uploading ${uploadedFiles.length > 0 ? 'additional ' : ''}files...` 
                            : dragActive 
                              ? 'Drop files here'
                              : uploadedFiles.length > 0
                                ? 'Add more files'
                                : 'Upload Images & Videos'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {dragActive 
                            ? 'Release to upload files'
                            : 'Drag and drop files here or click to browse'
                          }
                        </p>
                        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Image className="h-3 w-3" />
                            <span>Images (Max 10MB)</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Video className="h-3 w-3" />
                            <span>Videos (Max 50MB)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">
                        Uploaded Files ({uploadedFiles.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Remove all
                      </button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {file.type === 'image' ? (
                                <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                  <Image className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <span>•</span>
                                <span className="capitalize">{file.type}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground placeholder:text-muted-foreground"
                  placeholder="Any additional notes or comments..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <GlassButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  disabled={submitting}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={submitting || uploading}
                  className="flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Submit Assignment</span>
                    </>
                  )}
                </GlassButton>
              </div>
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}