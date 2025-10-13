import React, { useState, useEffect } from 'react'
import { 
  Plus, Clock, Users, CheckCircle, AlertCircle, Calendar,
  FileText, Upload, Star, MessageSquare, Eye, Edit, Trash2,
  GraduationCap, Award, BookOpen, Filter, Search, Download, X,
  Image, Video, Camera, Play, Send, ChevronRight, CheckCheck,
  XCircle, RotateCcw, FileImage, PlayCircle
} from 'lucide-react'
import { User, isValidUUID } from '../utils/auth'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { getAuthenticatedClient } from '../utils/supabase/client'

interface RecipesProps {
  user: User
  onNavigate: (page: string, id?: string) => void
}

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  deadline: string
  points: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  created_by: string
  instructor_name: string
  example_images?: string[]
  example_videos?: string[]
  created_at: string
  updated_at: string
  status: 'draft' | 'published' | 'closed'
  submission_count: number
  max_submissions?: number
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  recipe_title: string
  recipe_description: string
  ingredients: string[]
  instructions: string[]
  images: string[]
  video_url?: string
  notes?: string
  submitted_at: string
  status: 'pending' | 'approved' | 'needs_changes' | 'rejected'
  grade?: number
  feedback?: string
  instructor_feedback?: string
  graded_at?: string
  graded_by?: string
}

export function Recipes({ user, onNavigate }: RecipesProps) {
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions' | 'grading'>('assignments')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'pending'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAssignments(),
        loadSubmissions()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      const supabase = getAuthenticatedClient()
      
      // Get current session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session')
        setAssignments([])
        return
      }

      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading assignments:', error)
        setAssignments([])
      } else {
        setAssignments(data || [])
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      setAssignments([])
    }
  }

  const loadSubmissions = async () => {
    try {
      // Validate user ID before making request if filtering by student
      if (user.role === 'student' && !isValidUUID(user.id)) {
        console.error('Invalid user ID:', user.id)
        setSubmissions([])
        return
      }

      const supabase = getAuthenticatedClient()
      
      // Get current session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session')
        setSubmissions([])
        return
      }
      
      let query = supabase
        .from('assignments_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
      
      // If user is a student, only load their submissions
      if (user.role === 'student') {
        query = query.eq('student_id', user.id)
      }
      
      const { data, error } = await query

      if (error) {
        console.error('Error loading submissions:', error)
        setSubmissions([])
      } else {
        setSubmissions(data || [])
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
      setSubmissions([])
    }
  }

  const getStatusColor = (status: Assignment['status'], deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    if (status === 'draft') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    if (deadlineDate <= now || status === 'closed') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
  }

  const getDifficultyColor = (difficulty: Assignment['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
      case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getSubmissionStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      case 'needs_changes': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const now = new Date()
    const deadline = new Date(assignment.deadline)
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'open' && deadline > now && assignment.status === 'published') ||
                         (filterStatus === 'closed' && (deadline <= now || assignment.status === 'closed')) ||
                         (filterStatus === 'pending' && assignment.status === 'draft')
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-foreground mb-2">Recipe Assignments</h1>
            <p className="text-muted-foreground">
              {user.role === 'instructor' 
                ? 'Create and manage recipe assignments for your students'
                : 'View assignments and submit your culinary creations'
              }
            </p>
          </div>
          
          {(user.role === 'instructor' || user.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex mb-8 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'assignments'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4 inline mr-2" />
            Assignments
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'submissions'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Submissions
          </button>
          {(user.role === 'instructor' || user.role === 'admin') && (
            <button
              onClick={() => setActiveTab('grading')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'grading'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-4 w-4 inline mr-2" />
              Review Submissions
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="all">All Assignments</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              {(user.role === 'instructor' || user.role === 'admin') && <option value="pending">Draft</option>}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'assignments' && (
            <AssignmentsList
              assignments={filteredAssignments}
              user={user}
              onViewAssignment={(assignment) => {
                setSelectedAssignment(assignment)
                if (user.role === 'student') {
                  setShowSubmissionModal(true)
                }
              }}
              onDeleteAssignment={async (assignmentId) => {
                if (confirm('Are you sure you want to delete this assignment?')) {
                  try {
                    const supabase = getAuthenticatedClient()
                    const { error } = await supabase
                      .from('assignments')
                      .delete()
                      .eq('id', assignmentId)
                    
                    if (error) {
                      console.error('Error deleting assignment:', error)
                    } else {
                      loadAssignments()
                    }
                  } catch (error) {
                    console.error('Error deleting assignment:', error)
                  }
                }
              }}
            />
          )}
          
          {activeTab === 'submissions' && (
            <SubmissionsList
              submissions={submissions}
              assignments={assignments}
              user={user}
              onResubmit={(submission) => {
                const assignment = assignments.find(a => a.id === submission.assignment_id)
                if (assignment) {
                  setSelectedAssignment(assignment)
                  setSelectedSubmission(submission)
                  setShowSubmissionModal(true)
                }
              }}
            />
          )}
          
          {activeTab === 'grading' && (user.role === 'instructor' || user.role === 'admin') && (
            <GradingPanel
              submissions={submissions.filter(s => s.status === 'pending')}
              assignments={assignments}
              user={user}
              onReviewSubmission={(submission) => {
                setSelectedSubmission(submission)
                setShowReviewModal(true)
              }}
            />
          )}
        </div>

        {/* Modals */}
        {showCreateModal && (
          <CreateAssignmentModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadAssignments()
            }}
            user={user}
          />
        )}

        {showSubmissionModal && selectedAssignment && (
          <SubmissionModal
            assignment={selectedAssignment}
            existingSubmission={selectedSubmission}
            onClose={() => {
              setShowSubmissionModal(false)
              setSelectedAssignment(null)
              setSelectedSubmission(null)
            }}
            onSuccess={() => {
              setShowSubmissionModal(false)
              setSelectedAssignment(null)
              setSelectedSubmission(null)
              loadSubmissions()
            }}
            user={user}
          />
        )}

        {showReviewModal && selectedSubmission && (
          <ReviewSubmissionModal
            submission={selectedSubmission}
            assignment={assignments.find(a => a.id === selectedSubmission.assignment_id)}
            onClose={() => {
              setShowReviewModal(false)
              setSelectedSubmission(null)
            }}
            onSuccess={() => {
              setShowReviewModal(false)
              setSelectedSubmission(null)
              loadSubmissions()
            }}
            user={user}
          />
        )}
      </div>
    </div>
  )
}

// Assignment List Component
interface AssignmentsListProps {
  assignments: Assignment[]
  user: User
  onViewAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignmentId: string) => void
}

function AssignmentsList({ assignments, user, onViewAssignment, onDeleteAssignment }: AssignmentsListProps) {
  const getStatusColor = (status: Assignment['status'], deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    if (status === 'draft') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    if (deadlineDate <= now || status === 'closed') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
  }

  const getDifficultyColor = (difficulty: Assignment['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
      case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {assignments.map((assignment) => {
        const now = new Date()
        const deadline = new Date(assignment.deadline)
        const isOverdue = deadline <= now
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        return (
          <div key={assignment.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground mb-2">{assignment.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {assignment.description}
                </p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status, assignment.deadline)}`}>
                  {assignment.status === 'draft' ? 'Draft' : 
                   isOverdue ? 'Closed' : 'Open'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                  {assignment.difficulty}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  Due: {deadline.toLocaleDateString()}
                  {!isOverdue && (
                    <span className={`ml-2 ${daysUntilDeadline <= 3 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      ({daysUntilDeadline} days left)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Award className="h-4 w-4 mr-2" />
                <span>{assignment.points} points</span>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>{assignment.submission_count} submissions</span>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 mr-2" />
                <span>By {assignment.instructor_name}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onViewAssignment(assignment)}
                className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                {user.role === 'student' ? 'Submit Recipe' : 'View Details'}
              </button>
              
              {(user.role === 'instructor' || user.role === 'admin') && assignment.created_by === user.id && (
                <button
                  onClick={() => onDeleteAssignment(assignment.id)}
                  className="p-2 border border-border rounded-lg hover:bg-destructive/10 hover:border-destructive text-destructive transition-colors"
                  title="Delete Assignment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
      
      {assignments.length === 0 && (
        <div className="col-span-full flex items-center justify-center py-12">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              {(user.role === 'instructor' || user.role === 'admin')
                ? 'Create your first assignment to get started'
                : 'Check back later for new assignments'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Submissions List Component
interface SubmissionsListProps {
  submissions: Submission[]
  assignments: Assignment[]
  user: User
  onResubmit: (submission: Submission) => void
}

function SubmissionsList({ submissions, assignments, user, onResubmit }: SubmissionsListProps) {
  const getStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      case 'needs_changes': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    }
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        const assignment = assignments.find(a => a.id === submission.assignment_id)
        
        return (
          <div key={submission.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground mb-1">
                  {submission.recipe_title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Assignment: {assignment?.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {submission.recipe_description}
                </p>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                  {submission.status === 'approved' ? 'Approved' : 
                   submission.status === 'needs_changes' ? 'Needs Changes' :
                   submission.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                </span>
                
                {submission.grade && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-card-foreground">{submission.grade}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</span>
              {submission.graded_at && (
                <span>Reviewed: {new Date(submission.graded_at).toLocaleDateString()}</span>
              )}
            </div>

            {submission.feedback && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-card-foreground mb-2">Instructor Feedback:</h4>
                <p className="text-sm text-muted-foreground">{submission.feedback}</p>
              </div>
            )}

            {submission.status === 'needs_changes' && (
              <button
                onClick={() => onResubmit(submission)}
                className="flex items-center space-x-2 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Resubmit</span>
              </button>
            )}
          </div>
        )
      })}
      
      {submissions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">No submissions yet</h3>
            <p className="text-muted-foreground">
              Start by submitting your first recipe assignment!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Grading Panel Component
interface GradingPanelProps {
  submissions: Submission[]
  assignments: Assignment[]
  user: User
  onReviewSubmission: (submission: Submission) => void
}

function GradingPanel({ submissions, assignments, user, onReviewSubmission }: GradingPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-card-foreground mb-4">Pending Reviews ({submissions.length})</h3>
        
        {submissions.map((submission) => {
          const assignment = assignments.find(a => a.id === submission.assignment_id)
          
          return (
            <div key={submission.id} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
              <div className="flex-1">
                <h4 className="font-medium text-card-foreground">{submission.recipe_title}</h4>
                <p className="text-sm text-muted-foreground">
                  Submitted By {submission.student_name} • Assignment: {assignment?.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
              </div>
              
              <button
                onClick={() => onReviewSubmission(submission)}
                className="flex items-center space-x-2 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Review</span>
              </button>
            </div>
          )
        })}
        
        {submissions.length === 0 && (
          <div className="text-center py-8">
            <CheckCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">All submissions have been reviewed!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Create Assignment Modal Component
interface CreateAssignmentModalProps {
  onClose: () => void
  onSuccess: () => void
  user: User
}

function CreateAssignmentModal({ onClose, onSuccess, user }: CreateAssignmentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    deadline: '',
    points: 100,
    difficulty: 'beginner' as Assignment['difficulty'],
    category: 'general'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getAuthenticatedClient()
      
      const { error } = await supabase
        .from('assignments')
        .insert([{
          ...formData,
          created_by: user.id,
          instructor_name: user.name,
          status: 'published',
          submission_count: 0
        }])

      if (error) {
        setError(error.message)
      } else {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating assignment:', error)
      setError('An error occurred while creating the assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-card-foreground">Create New Assignment</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Assignment title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Brief description of the assignment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Instructions *</label>
            <textarea
              required
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              rows={5}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Detailed instructions for students"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Due Date *</label>
              <input
                type="datetime-local"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Points</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.points}
                onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({...formData, difficulty: e.target.value as Assignment['difficulty']})}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="general">General</option>
                <option value="appetizers">Appetizers</option>
                <option value="mains">Main Courses</option>
                <option value="desserts">Desserts</option>
                <option value="baking">Baking</option>
                <option value="techniques">Techniques</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Submission Modal Component
interface SubmissionModalProps {
  assignment: Assignment
  existingSubmission?: Submission | null
  onClose: () => void
  onSuccess: () => void
  user: User
}

function SubmissionModal({ assignment, existingSubmission, onClose, onSuccess, user }: SubmissionModalProps) {
  const [formData, setFormData] = useState({
    recipe_title: existingSubmission?.recipe_title || '',
    recipe_description: existingSubmission?.recipe_description || '',
    ingredients: existingSubmission?.ingredients || [''],
    instructions: existingSubmission?.instructions || [''],
    notes: existingSubmission?.notes || '',
    uploadedFiles: [] as Array<{name: string, size: number, type: 'image' | 'video', url: string}>
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const addIngredient = () => {
    setFormData({...formData, ingredients: [...formData.ingredients, '']})
  }

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[index] = value
    setFormData({...formData, ingredients: newIngredients})
  }

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index)
    setFormData({...formData, ingredients: newIngredients})
  }

  const addInstruction = () => {
    setFormData({...formData, instructions: [...formData.instructions, '']})
  }

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions]
    newInstructions[index] = value
    setFormData({...formData, instructions: newInstructions})
  }

  const removeInstruction = (index: number) => {
    const newInstructions = formData.instructions.filter((_, i) => i !== index)
    setFormData({...formData, instructions: newInstructions})
  }

  // File upload functionality
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
    
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFileUpload(files)
    }
  }

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return
    
    setUploading(true)
    setError('')
    
    try {
      const supabase = getAuthenticatedClient()
      const uploadedFiles = []
      
      for (const file of files) {
        // Validate file size
        const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for videos, 10MB for images
        if (file.size > maxSize) {
          setError(`File ${file.name} is too large. Maximum size is ${file.type.startsWith('video/') ? '50MB' : '10MB'}.`)
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `submissions/${user.id}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('make-c56dfc7a-assignment-files')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setError(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('make-c56dfc7a-assignment-files')
          .getPublicUrl(filePath)

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: urlData.publicUrl
        })
      }

      // Update form data with new files
      setFormData(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...uploadedFiles]
      }))

    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = formData.uploadedFiles.filter((_, i) => i !== index)
    setFormData({...formData, uploadedFiles: newFiles})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getAuthenticatedClient()
      
      const submissionData = {
        recipe_title: formData.recipe_title,
        recipe_description: formData.recipe_description,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
        notes: formData.notes,
        assignment_id: assignment.id,
        student_id: user.id,
        student_name: user.name,
        images: formData.uploadedFiles.map(file => file.url),
        files: formData.uploadedFiles,
        status: 'pending'
      }

      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('assignments_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id)
        
        if (error) {
          setError(error.message)
        } else {
          onSuccess()
        }
      } else {
        // Create new submission
        const { error } = await supabase
          .from('assignments_submissions')
          .insert([submissionData])
        
        if (error) {
          setError(error.message)
        } else {
          onSuccess()
        }
      }
    } catch (error) {
      console.error('Error submitting recipe:', error)
      setError('An error occurred while submitting your recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground font-semibold">
              {existingSubmission ? 'Resubmit Recipe' : 'Submit Recipe'} - {assignment.title}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Recipe Title *</label>
            <input
              type="text"
              required
              value={formData.recipe_title}
              onChange={(e) => setFormData({...formData, recipe_title: e.target.value})}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Your recipe title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Description *</label>
            <textarea
              required
              value={formData.recipe_description}
              onChange={(e) => setFormData({...formData, recipe_description: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Describe your recipe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Ingredients *</label>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  required
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  placeholder={`Ingredient ${index + 1}`}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Ingredient</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Instructions *</label>
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                  {index + 1}
                </div>
                <textarea
                  required
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  placeholder={`Step ${index + 1}`}
                  rows={2}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg self-start"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Step</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Any additional notes or comments"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">Images & Videos</label>
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
                        ? `Uploading ${formData.uploadedFiles?.length > 0 ? 'additional ' : ''}files...` 
                        : dragActive 
                          ? 'Drop files here'
                          : formData.uploadedFiles?.length > 0
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
            {formData.uploadedFiles && formData.uploadedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Uploaded Files ({formData.uploadedFiles.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, uploadedFiles: []})}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove all
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {formData.uploadedFiles.map((file, index) => (
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

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (existingSubmission ? 'Resubmitting...' : 'Submitting...') : (existingSubmission ? 'Resubmit Recipe' : 'Submit Recipe')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Review Submission Modal Component
interface ReviewSubmissionModalProps {
  submission: Submission
  assignment?: Assignment
  onClose: () => void
  onSuccess: () => void
  user: User
}

function ReviewSubmissionModal({ submission, assignment, onClose, onSuccess, user }: ReviewSubmissionModalProps) {
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [grade, setGrade] = useState(submission.grade || 0)
  const [status, setStatus] = useState<'approved' | 'needs_changes' | 'rejected'>('approved')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getAuthenticatedClient()
      
      const { error } = await supabase
        .from('assignments_submissions')
        .update({
          status,
          grade,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        })
        .eq('id', submission.id)

      if (error) {
        setError(error.message)
      } else {
        onSuccess()
      }
    } catch (error) {
      console.error('Error updating submission:', error)
      setError('An error occurred while updating the submission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground font-semibold">Review Submission - {submission.recipe_title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Submission Details */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Submission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Student:</span>
                <span className="ml-2 text-foreground">{submission.student_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assignment:</span>
                <span className="ml-2 text-foreground">{assignment?.title}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted:</span>
                <span className="ml-2 text-foreground">{new Date(submission.submitted_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Points Possible:</span>
                <span className="ml-2 text-foreground">{assignment?.points || 0}</span>
              </div>
            </div>
          </div>

          {/* Recipe Content */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Recipe Content</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground">{submission.recipe_description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Ingredients</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {submission.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Instructions</h4>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  {submission.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>

              {submission.notes && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Additional Notes</h4>
                  <p className="text-muted-foreground">{submission.notes}</p>
                </div>
              )}
              
              {/* Uploaded Images and Videos */}
              {submission.files && submission.files.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Uploaded Files ({submission.files.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {submission.files.map((file, index) => (
                      <div key={index} className="relative group border border-border rounded-lg overflow-hidden bg-muted/30">
                        {file.type === 'image' ? (
                          <div className="aspect-square relative">
                            <ImageWithFallback
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white/90 rounded-full p-2">
                                <Eye className="h-4 w-4 text-gray-700" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-square bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center p-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
                              <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-foreground truncate max-w-full">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{file.name}</p>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0"
                          title={`View ${file.name}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy image support */}
              {submission.images && submission.images.length > 0 && (!submission.files || submission.files.length === 0) && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Images ({submission.images.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {submission.images.map((imageUrl, index) => (
                      <div key={index} className="relative group border border-border rounded-lg overflow-hidden bg-muted/30">
                        <div className="aspect-square relative">
                          <ImageWithFallback
                            src={imageUrl}
                            alt={`Submission image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 rounded-full p-2">
                              <Eye className="h-4 w-4 text-gray-700" />
                            </div>
                          </div>
                        </div>
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0"
                          title={`View image ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t border-border pt-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Review Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="approved">Approved</option>
                <option value="needs_changes">Needs Changes</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Grade (0-{assignment?.points || 100})</label>
              <input
                type="number"
                min="0"
                max={assignment?.points || 100}
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="Provide constructive feedback to the student..."
              />
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
