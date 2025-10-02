'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectGrapeNames } from '@/lib/grape-linking'

interface GrapeLinkedTextProps {
  text: string
  grapeVarieties: string[]
  onGrapeClick: (grapeId: number) => void
}

export default function GrapeLinkedText({ text, grapeVarieties, onGrapeClick }: GrapeLinkedTextProps) {
  const [processedText, setProcessedText] = useState(text)
  const [isProcessed, setIsProcessed] = useState(false)
  const supabase = createClient()
  
  useEffect(() => {
    // Only process if we have grape varieties and haven't processed yet, and text doesn't contain HTML
    if (grapeVarieties.length > 0 && !isProcessed && !text.includes('data-grape') && !text.includes('grape-link') && !/<[^>]+>/g.test(text)) {
      const grapeMatches = detectGrapeNames(text, grapeVarieties)
      
      if (grapeMatches.length > 0) {
        let linkedText = text
        
        // Process matches in order of length (longest first)
        const sortedMatches = grapeMatches.sort((a, b) => b.grape_variety.length - a.grape_variety.length)
        
        for (const match of sortedMatches) {
          if (grapeVarieties.includes(match.grape_variety)) {
            // Use a more robust approach for multi-word grape names
            const escapedGrapeName = match.grape_variety.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            // Use word boundaries that work better with multi-word phrases
            const regex = new RegExp(`(^|[^\\w])${escapedGrapeName}([^\\w]|$)`, 'gi')
            const replacement = `$1<span class="grape-link" data-grape-name="${match.grape_variety}" style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">${match.grape_variety}</span>$2`
            linkedText = linkedText.replace(regex, replacement)
          }
        }
        
        setProcessedText(linkedText)
        setIsProcessed(true)
      }
    }
  }, [text, grapeVarieties, isProcessed])
  
  // If text contains HTML, render it safely
  if (processedText.includes('<span class="grape-link"')) {
    return (
      <span 
        dangerouslySetInnerHTML={{ __html: processedText }}
        onClick={async (e) => {
          const target = e.target as HTMLElement
          if (target.classList.contains('grape-link')) {
            const grapeName = target.getAttribute('data-grape-name')
            if (grapeName) {
              // Get grape ID from database
              const { data } = await supabase
                .from('grapes')
                .select('grape_id')
                .eq('grape_variety', grapeName)
                .single()
              
              if (data?.grape_id) {
                onGrapeClick(data.grape_id)
              }
            }
          }
        }}
      />
    )
  }
  
  // Otherwise, render as plain text
  return <span>{processedText}</span>
}
