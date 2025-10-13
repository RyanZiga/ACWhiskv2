import React from 'react'

/**
 * Utility to detect URLs in text and convert them to clickable links
 */

// URL regex pattern - detects http, https, and www URLs
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

/**
 * Converts URLs in text to clickable anchor tags
 * @param text - The text content to linkify
 * @returns React elements with clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  // Find all URL matches
  const matches = Array.from(text.matchAll(URL_REGEX))

  if (matches.length === 0) {
    // No URLs found, return original text
    return [text]
  }

  matches.forEach((match, index) => {
    const url = match[0]
    const startIndex = match.index!

    // Add text before the URL
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex))
    }

    // Ensure URL has protocol
    let href = url
    if (url.startsWith('www.')) {
      href = `https://${url}`
    }

    // Add the clickable link
    parts.push(
      <a
        key={`link-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline font-medium transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    )

    lastIndex = startIndex + url.length
  })

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

/**
 * Component wrapper for linkified text
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = linkifyText(text)
  
  return (
    <span className={className}>
      {parts}
    </span>
  )
}
