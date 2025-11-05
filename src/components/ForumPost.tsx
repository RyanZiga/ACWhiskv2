import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageSquare, Send, Clock, User } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface ForumPost {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  author_name: string
  author_role: string
  created_at: string
  replies: Array<{
    id: string
    content: string
    author_id: string
    author_name: string
    author_role: string
    created_at: string
  }>
}

interface ForumPostProps {
  postId: string
  user: User
  onNavigate: (page: string) => void
}

export function ForumPost({ postId, user, onNavigate }: ForumPostProps) {
  const [post, setPost] = useState<ForumPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/forum`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { posts } = await response.json()
        const foundPost = posts.find((p: ForumPost) => p.id === postId)
        setPost(foundPost || null)
      }
    } catch (error) {
      console.error('Error loading post:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitReply = async () => {
    if (!replyText.trim() || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/forum/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: replyText.trim() })
      })

      if (response.ok) {
        const { post: updatedPost } = await response.json()
        setPost(updatedPost)
        setReplyText('')
      }
    } catch (error) {
      console.error('Error submitting reply:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-blue-100 text-blue-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading post...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h2>
          <p className="text-gray-600 mb-4">The discussion you're looking for doesn't exist.</p>
          <button
            onClick={() => onNavigate('forum')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Forum
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate('forum')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Forum</span>
        </button>
      </div>

      {/* Original Post */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900">{post.author_name}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(post.author_role)}`}>
                {post.author_role}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <span className="capitalize">{post.category.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>

      {/* Replies Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <MessageSquare className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>
        </div>

        {/* Reply Form */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-3"
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim() || submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Posting...' : 'Post Reply'}</span>
          </button>
        </div>

        {/* Replies List */}
        <div className="space-y-4">
          {post.replies.map((reply) => (
            <div key={reply.id} className="border-l-4 border-orange-200 pl-4 py-2">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{reply.author_name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(reply.author_role)}`}>
                      {reply.author_role}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            </div>
          ))}

          {post.replies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No replies yet. Be the first to join the discussion!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}