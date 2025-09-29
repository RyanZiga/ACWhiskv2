import React, { useState } from 'react'
import { ChefHat, X } from 'lucide-react'
import { useAuth } from '../App'
import logoImage from '../asset/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png'

interface LandingProps {
  onNavigate: (page: string) => void
}

export function Landing({ onNavigate }: LandingProps) {
  const { login, signup } = useAuth()
  const [activeForm, setActiveForm] = useState<'signin' | 'signup'>('signin')

  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: 'linear-gradient(294deg,rgba(238, 174, 202, 1) 0%, rgba(122, 165, 222, 1) 73%)'}}>
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full opacity-20 animate-pulse" style={{backgroundColor: '#3C467B'}}></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-15 animate-pulse" style={{backgroundColor: '#3C467B', animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 animate-pulse" style={{backgroundColor: '#3C467B', animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Glassmorphism Container */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
              
              {/* Form Toggle */}
              <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 mb-8">
                <button
                  onClick={() => setActiveForm('signin')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-300 ${
                    activeForm === 'signin' 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveForm('signup')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-300 ${
                    activeForm === 'signup' 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Auth Form */}
              {activeForm === 'signin' ? (
                <SignInForm onNavigate={onNavigate} />
              ) : (
                <SignUpForm onNavigate={onNavigate} />
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

interface SignInFormProps {
  onNavigate: (page: string) => void
}

function SignInForm({ onNavigate }: SignInFormProps) {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      if (result.success) {
        onNavigate('feed')
      } else {
        setError(result.error || 'Sign in failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full mb-4">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="ACWhisk Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-white/90 font-medium">ACWhisk</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-white/70">Sign in to continue your culinary journey</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-[rgba(254,254,254,1)] rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 font-semibold transform hover:scale-[1.02] active:scale-[0.98] shadow-lg px-[16px] py-[12px] text-center"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  )
}

interface SignUpFormProps {
  onNavigate: (page: string) => void
}

function SignUpForm({ onNavigate }: SignUpFormProps) {
  const { signup } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signup(formData.email, formData.password, formData.name, formData.role)
      if (result.success) {
        onNavigate('feed')
      } else {
        setError(result.error || 'Sign up failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full mb-4">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="ACWhisk Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-white/90 font-medium">ACWhisk</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Join ACWhisk</h2>
        <p className="text-white/70">Start your culinary adventure today</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
          >
            <option value="student" className="bg-blue-900 text-white">Student</option>
            <option value="instructor" className="bg-blue-900 text-white">Instructor</option>
            <option value="admin" className="bg-blue-900 text-white">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-white/90 text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 font-semibold transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  )
}
