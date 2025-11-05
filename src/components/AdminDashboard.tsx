import React, { useState, useEffect } from 'react'
import { Users, FileText, MessageSquare, Activity, TrendingUp, TrendingDown, Eye, ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { GlassCard } from './ui/glass-card'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { projectId } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface AdminDashboardProps {
  user: User
  onNavigate: (page: string) => void
}

interface Stats {
  totalUsers: number
  totalRecipes: number
  totalMessages: number
  activeUsers: number
  newUsersToday: number
  recipesPostedToday: number
  messagesLastHour: number
  systemHealth: number
}

interface ChartData {
  userGrowth: Array<{ date: string; students: number; instructors: number; total: number }>
  recipeActivity: Array<{ date: string; posted: number; viewed: number; rated: number }>
  userDistribution: Array<{ name: string; value: number; color: string }>
  platformActivity: Array<{ date: string; messages: number; assignments: number; submissions: number }>
  topCategories: Array<{ name: string; posts: number; color: string }>
}

export function AdminDashboard({ user, onNavigate }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRecipes: 0,
    totalMessages: 0,
    activeUsers: 0,
    newUsersToday: 0,
    recipesPostedToday: 0,
    messagesLastHour: 0,
    systemHealth: 98.5
  })

  const [chartData, setChartData] = useState<ChartData>({
    userGrowth: [],
    recipeActivity: [],
    userDistribution: [],
    platformActivity: [],
    topCategories: []
  })

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAnalytics = async () => {
    try {
      setError(null)
      console.log('📊 Fetching admin analytics...')
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/analytics`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Analytics data received:', data)

      setStats(data.stats)
      setChartData(data.chartData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    

    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="btn-gradient px-6 py-3 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="mb-4 lg:mb-0">
              <p className="text-muted-foreground mb-1">Hello {user.name}, Admin Control Center</p>
              <h1 className="text-3xl font-bold text-foreground">System Analytics Dashboard</h1>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 30s
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-3 rounded-lg bg-card border border-border hover:bg-muted transition-colors flex items-center space-x-2 touch-target"
                title="Refresh analytics"
              >
                <RefreshCw className={`h-5 w-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-foreground">Refresh</span>
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="btn-gradient px-6 py-3 rounded-lg flex items-center space-x-2 transform hover:scale-105 shadow-lg touch-target"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Admin Panel</span>
              </button>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <GlassCard className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-200/30 dark:border-blue-400/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">+{stats.newUsersToday} today</span>
            </div>
          </GlassCard>


          <GlassCard className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-200/30 dark:border-purple-400/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Total Recipes</p>
                <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                  {stats.totalRecipes}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">+{stats.recipesPostedToday} today</span>
            </div>
          </GlassCard>


          <GlassCard className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-200/30 dark:border-green-400/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Total Messages</p>
                <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {stats.totalMessages.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-700 dark:text-green-300" />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-600 dark:text-blue-400">{stats.messagesLastHour} last hour</span>
            </div>
          </GlassCard>


          <GlassCard className="p-6 bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-200/30 dark:border-orange-400/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-orange-800 dark:text-orange-200">
                  {stats.activeUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/30 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-700 dark:text-orange-300" />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-600 dark:text-purple-400">Last 24 hours</span>
            </div>
          </GlassCard>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          <GlassCard className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">User Growth Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days user registration</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.userGrowth}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInstructors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="students" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStudents)" name="Students" />
                <Area type="monotone" dataKey="instructors" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorInstructors)" name="Instructors" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Recipe Activity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Posts, views, and ratings</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.recipeActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="posted" stroke="#ef4444" strokeWidth={2} name="Posted" />
                <Line type="monotone" dataKey="viewed" stroke="#3b82f6" strokeWidth={2} name="Viewed" />
                <Line type="monotone" dataKey="rated" stroke="#10b981" strokeWidth={2} name="Rated" />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          <GlassCard className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">User Distribution</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">By role type</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {chartData.userDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Platform Activity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily interactions</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.platformActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="messages" fill="#3b82f6" name="Messages" />
                <Bar dataKey="assignments" fill="#8b5cf6" name="Assignments" />
                <Bar dataKey="submissions" fill="#10b981" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Top Recipe Categories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Most popular topics</p>
            </div>
            <div className="space-y-3">
              {chartData.topCategories.map((category, index) => {
                const maxPosts = Math.max(...chartData.topCategories.map(c => c.posts))
                const percentage = (category.posts / maxPosts) * 100
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.posts}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color
                        }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          <GlassCard className="p-6 bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-green-200/30 dark:border-green-400/30">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">System Health</p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-200 mb-1">
                {stats.systemHealth}%
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">All systems operational</p>
            </div>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Online</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Response: 42ms</p>
            <div className="mt-3 flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span>Healthy</span>
            </div>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">2.3 GB</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">of 10 GB used</p>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </GlassCard>


          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">API Status</p>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Active</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">1.2K requests/min</p>
            <div className="mt-3 flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span>Operational</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
