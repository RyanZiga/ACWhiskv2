import React, { useState, useEffect } from 'react'
import { Plus, Clock, Star, ChefHat, Award, BookOpen, FileText, AlertCircle, CheckCircle, Target, Upload } from 'lucide-react'
import { GlassCard, GlassButton } from './ui/glass-card'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { SubmissionModal } from './SubmissionModal'
import { RoleChecker } from './RoleChecker'
import { StorageTestComponent } from './StorageTestComponent'
import { UploadComparisonTest } from './UploadComparisonTest'
import { RoleSwitcher } from './RoleSwitcher'
import { isValidUUID } from '../utils/auth'

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
  submitted?: boolean
  grade?: number
}

interface Submission {
  id: string
  assignment_id: string
  recipe_title: string
  submitted_at: string
  status: 'submitted' | 'graded' | 'returned'
  grade?: number
  feedback?: string
  images?: Array<{url: string, path: string, name: string}>
  videos?: Array<{url: string, path: string, name: string}>
}

interface DashboardProps {
  user: User
  onNavigate: (page: string, id?: string) => void
}

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [submissionModal, setSubmissionModal] = useState<{isOpen: boolean, assignment: Assignment | null}>({
    isOpen: false,
    assignment: null
  })

  useEffect(() => {
    if (user.role === 'student') {
      loadAssignments()
      loadSubmissions()
    }
    setLoading(false)
  }, [])



  const loadAssignments = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/assignments`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const { assignments: userAssignments } = await response.json()
        setAssignments(userAssignments || [])
      } else {
        console.error('Failed to load assignments:', response.status, response.statusText)
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('Error response body:', errorText)
        setAssignments([])
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Assignments request timed out')
      } else {
        console.error('Error loading assignments:', error)
      }
      setAssignments([])
    }
  }

  const loadSubmissions = async () => {
    try {
      // Validate user ID before making request
      if (!isValidUUID(user.id)) {
        console.error('Invalid user ID:', user.id)
        setSubmissions([])
        return
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/submissions?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { submissions: userSubmissions } = await response.json()
        setSubmissions(userSubmissions || [])
      } else {
        console.log('No submissions found or API error')
        setSubmissions([])
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
      setSubmissions([])
    }
  }



  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Hard': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  const handleSubmissionComplete = () => {
    // Reload submissions to show the new one
    loadSubmissions()
    loadAssignments()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate stats based on submissions and assignments
  const completedAssignments = submissions.filter(s => s.status === 'graded').length
  const pendingAssignments = assignments.filter(a => {
    const hasSubmission = submissions.some(s => s.assignment_id === a.id)
    return !hasSubmission && a.status === 'published'
  }).length
  const avgGrade = submissions.length > 0 
    ? submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / submissions.length
    : 0
  const completionPercentage = assignments.length > 0 
    ? Math.round((completedAssignments / assignments.length) * 100)
    : 0
  const totalSubmissions = submissions.length

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Temporary Debug Components */}
        <div className="space-y-6 mb-8">
          <RoleChecker user={user} />
          <RoleSwitcher user={user} />
          <StorageTestComponent user={user} />
          <UploadComparisonTest user={user} />
        </div>
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="mb-4 lg:mb-0">
              <p className="text-muted-foreground mb-1">Hello {user.name}, Welcome back</p>
              <h1 className="text-3xl font-bold text-foreground">Your Learning Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate(user.role === 'instructor' ? 'admin' : 'learning')}
                className="btn-gradient px-6 py-3 rounded-lg flex items-center space-x-2 transform hover:scale-105 shadow-lg touch-target"
              >
                <Plus className="h-5 w-5" />
                <span>{user.role === 'instructor' ? 'Create Assignment' : 'Browse Learning Hub'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Latest Uploads Card */}
          <div className="lg:col-span-4">
            <GlassCard className="p-6 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 border-teal-200/30 dark:border-teal-400/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-teal-700 dark:text-teal-300 mb-1">Assignments</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">
                    {completedAssignments} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-teal-500/30 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-teal-700 dark:text-teal-300" />
                </div>
              </div>
              <div className="relative h-24 bg-gradient-to-br from-teal-300/30 to-cyan-400/30 rounded-xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-teal-400/20 rounded-xl"></div>
                <div className="relative flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
                  <div className="w-4 h-4 bg-teal-400 rounded-full animate-pulse delay-100"></div>
                  <div className="w-3 h-3 bg-teal-600 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Latest Media Card */}
          <div className="lg:col-span-3">
            <GlassCard className="p-6 bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-green-200/30 dark:border-green-400/30 h-full">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Submissions</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {totalSubmissions} total
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Assignment Status Card */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6 bg-gradient-to-br from-orange-400/20 to-yellow-500/20 border-orange-200/30 dark:border-orange-400/30 h-full">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  {user.role === 'student' ? (
                    <FileText className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                  ) : (
                    <Award className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                  )}
                </div>
                {user.role === 'student' ? (
                  <>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Due Soon</p>
                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                      {assignments.filter(a => {
                        try {
                          const deadline = new Date(a.deadline)
                          if (isNaN(deadline.getTime())) return false
                          const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          const hasSubmission = submissions.some(s => s.assignment_id === a.id)
                          return daysUntilDeadline <= 7 && daysUntilDeadline > 0 && !hasSubmission
                        } catch (error) {
                          console.error('Error parsing assignment deadline:', error)
                          return false
                        }
                      }).length}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">assignments</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Pending</p>
                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                      {pendingAssignments}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">to review</p>
                  </>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Progress Card */}
          <div className="lg:col-span-3">
            <GlassCard className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-200/30 dark:border-blue-400/30 h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="relative">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">What's your</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-2">plan ?</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">Looks like a lovely day</p>
                <div className="text-right">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full text-white">
                    <span className="text-lg font-bold">{Math.round(completionPercentage)}</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">% complete</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Assignment Section for Students */}
        {user.role === 'student' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pending Assignments */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white">Pending Assignments</h3>
                <GlassButton
                  onClick={() => onNavigate('learning')}
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  View All Assignments
                </GlassButton>
              </div>
              
              <div className="space-y-4">
                {assignments.filter(a => {
                  const hasSubmission = submissions.some(s => s.assignment_id === a.id)
                  return !hasSubmission && a.status === 'published'
                }).slice(0, 3).map((assignment) => {
                  const deadline = new Date(assignment.deadline)
                  if (isNaN(deadline.getTime())) return null
                  const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const isUrgent = daysUntilDeadline <= 3
                  
                  return (
                    <div key={assignment.id} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                         onClick={() => setSubmissionModal({ isOpen: true, assignment })}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isUrgent ? 'bg-red-500/20' : 'bg-blue-500/20'
                      }`}>
                        {isUrgent ? (
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due in {daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''} • {assignment.points} points
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isUrgent 
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                          {assignment.difficulty}
                        </span>
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
                
                {assignments.filter(a => {
                  const hasSubmission = submissions.some(s => s.assignment_id === a.id)
                  return !hasSubmission && a.status === 'published'
                }).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">All assignments completed!</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Recent Grades */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white">Recent Grades</h3>
                <GlassButton
                  onClick={() => onNavigate('profile')}
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  View Grade Report
                </GlassButton>
              </div>
              
              <div className="space-y-4">
                {submissions.filter(s => s.status === 'graded').slice(0, 3).map((submission) => {
                  const assignment = assignments.find(a => a.id === submission.assignment_id)
                  const gradeColor = submission.grade && submission.grade >= 90 ? 'text-green-600 dark:text-green-400' :
                                   submission.grade && submission.grade >= 80 ? 'text-blue-600 dark:text-blue-400' :
                                   submission.grade && submission.grade >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                   'text-red-600 dark:text-red-400'
                  
                  return (
                    <div key={submission.id} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                         onClick={() => onNavigate('profile')}>
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {submission.recipe_title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment?.title} • {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${gradeColor}`}>
                          {submission.grade}/100
                        </p>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round((submission.grade || 0) / 20)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {submissions.filter(s => s.status === 'graded').length === 0 && (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No grades yet</p>
                    <p className="text-xs text-gray-400 mt-1">Complete assignments to see your grades here</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-5">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                    Recent
                  </button>
                  <button className="px-3 py-1 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                    All Activity
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {submissions.slice(0, 3).map((submission, index) => {
                  const assignment = assignments.find(a => a.id === submission.assignment_id)
                  return (
                    <div key={submission.id} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                         onClick={() => onNavigate('profile')}>
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        {submission.status === 'graded' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {submission.recipe_title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment?.title} • {formatDate(submission.submitted_at.toString())}
                        </p>
                      </div>
                      <div className="text-right">
                        {submission.grade ? (
                          <>
                            <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                              {submission.grade}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">grade</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">pending</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {submissions.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No submissions yet</p>
                    <button
                      onClick={() => onNavigate('learning')}
                      className="text-purple-600 dark:text-purple-400 text-sm mt-2 hover:underline"
                    >
                      View assignments
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Circular Progress */}
          <div className="lg:col-span-3">
            <GlassCard className="p-6 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - completionPercentage / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Assignment Progress</p>
            </GlassCard>
          </div>

          {/* Achievement Card */}
          <div className="lg:col-span-4">
            <GlassCard className="p-6 bg-gradient-to-br from-pink-400/20 to-purple-500/20 border-pink-200/30 dark:border-pink-400/30">
              <div className="text-center">
                <p className="text-sm text-pink-700 dark:text-pink-300 mb-2">Academic Achievement</p>
                <div className="text-4xl font-bold text-pink-800 dark:text-pink-200 mb-2">
                  {Math.round(avgGrade)}%
                </div>
                <p className="text-sm text-pink-600 dark:text-pink-400 mb-4">
                  Average Grade • {completedAssignments} completed
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-pink-700 dark:text-pink-300">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{totalSubmissions} submissions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4" />
                    <span>{completedAssignments} graded</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>{Math.round(avgGrade)}% avg</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* New Educational Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Learning Progress */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Learning Progress</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Culinary Fundamentals</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">85% complete</p>
                  </div>
                </div>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <ChefHat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Advanced Techniques</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">62% complete</p>
                  </div>
                </div>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Recipe Development</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">43% complete</p>
                  </div>
                </div>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '43%' }}></div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Grades Overview */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Grades Overview</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user.role === 'student' ? '87.5' : '92.1'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall GPA</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">A+ Assignments</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {user.role === 'student' ? '6' : '12'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed Projects</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {user.role === 'student' ? '15' : '28'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Score</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {user.role === 'student' ? '87%' : '91%'}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Video Tutorials Section */}
        <div className="mt-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">Video Tutorials</h3>
              <GlassButton
                onClick={() => onNavigate('learning')}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                View All Tutorials
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tutorial 1 */}
              <div className="bg-white/30 dark:bg-gray-800/30 rounded-xl overflow-hidden">
                <div className="relative">
                  <iframe
                    className="w-full h-48"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Knife Skills Fundamentals"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Knife Skills Fundamentals</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Learn proper cutting techniques</p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>12:34</span>
                  </div>
                </div>
              </div>

              {/* Tutorial 2 */}
              <div className="bg-white/30 dark:bg-gray-800/30 rounded-xl overflow-hidden">
                <div className="relative">
                  <iframe
                    className="w-full h-48"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Sauce Making Basics"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Sauce Making Basics</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Master the art of sauce preparation</p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>18:26</span>
                  </div>
                </div>
              </div>

              {/* Tutorial 3 */}
              <div className="bg-white/30 dark:bg-gray-800/30 rounded-xl overflow-hidden">
                <div className="relative">
                  <iframe
                    className="w-full h-48"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Plating Techniques"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Plating Techniques</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Professional presentation skills</p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>15:42</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div> 

      {/* Submission Modal */}
      {submissionModal.isOpen && submissionModal.assignment && (
        <SubmissionModal
          isOpen={submissionModal.isOpen}
          onClose={() => setSubmissionModal({ isOpen: false, assignment: null })}
          assignment={submissionModal.assignment}
          user={user}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}
    </div>
  )
}

