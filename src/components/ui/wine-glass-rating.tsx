'use client'

import { useState } from 'react'
import { Wine } from 'lucide-react'

interface WineGlassRatingProps {
  rating: number
  onRatingChange: (rating: number) => void
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

export function WineGlassRating({ 
  rating, 
  onRatingChange, 
  maxRating = 5, 
  size = 'md',
  interactive = true 
}: WineGlassRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const handleClick = (newRating: number) => {
    if (interactive) {
      onRatingChange(newRating)
    }
  }

  const handleMouseEnter = (newRating: number) => {
    if (interactive) {
      setHoverRating(newRating)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0)
    }
  }

  const getGlassColor = (index: number) => {
    const displayRating = hoverRating || rating
    
    if (index + 1 <= displayRating) {
      return 'text-amber-600 fill-amber-600' // Filled glass
    } else {
      return 'text-amber-300 fill-amber-100' // Empty glass
    }
  }

  return (
    <div className={`flex items-center gap-1 ${interactive ? 'cursor-pointer' : ''}`}>
      {Array.from({ length: maxRating }, (_, index) => (
        <Wine
          key={index}
          className={`${sizeClasses[size]} transition-colors duration-200 ${getGlassColor(index)}`}
          onClick={() => handleClick(index + 1)}
          onMouseEnter={() => handleMouseEnter(index + 1)}
          onMouseLeave={handleMouseLeave}
        />
      ))}
      {interactive && (
        <span className="ml-2 text-sm text-amber-600">
          {rating > 0 ? `${rating}/${maxRating}` : 'Rate'}
        </span>
      )}
    </div>
  )
}
