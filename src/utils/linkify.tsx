import React from 'react'


const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

/**
 * @param text - 
 * @returns 
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  let lastIndex = 0


  const matches = Array.from(text.matchAll(URL_REGEX))

  if (matches.length === 0) {

    return [text]
  }

  matches.forEach((match, index) => {
    const url = match[0]
    const startIndex = match.index!


    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex))
    }


    let href = url
    if (url.startsWith('www.')) {
      href = `https://${url}`
    }


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


  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = linkifyText(text)
  
  return (
    <span className={className}>
      {parts}
    </span>
  )
}
