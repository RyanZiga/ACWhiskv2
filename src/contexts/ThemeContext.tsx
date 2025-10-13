import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    try {
      // Check for saved preference or system preference
      const savedTheme = localStorage.getItem('acwhisk-theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
      setIsDark(shouldBeDark)
      
      // Apply theme to document
      document.documentElement.classList.toggle('dark', shouldBeDark)
    } catch (error) {
      console.warn('Theme initialization error:', error)
      // Fallback to light theme
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    try {
      const newTheme = !isDark
      setIsDark(newTheme)
      
      // Save preference
      localStorage.setItem('acwhisk-theme', newTheme ? 'dark' : 'light')
      
      // Apply to document
      document.documentElement.classList.toggle('dark', newTheme)
    } catch (error) {
      console.warn('Theme toggle error:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}