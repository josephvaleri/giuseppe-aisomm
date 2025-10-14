import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchWines } from '@/lib/labels/fuzzy-match'

/**
 * POST /api/labels/manual
 * Handles manual entry of wine details (when user types instead of scanning)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { producer, wine_name, vintage } = body

    if (!producer || !wine_name) {
      return NextResponse.json(
        { error: 'Producer and wine name are required' },
        { status: 400 }
      )
    }

    // Validate vintage if provided
    if (vintage) {
      const vintageNum = parseInt(vintage)
      const currentYear = new Date().getFullYear()
      
      if (isNaN(vintageNum) || vintageNum < 1900 || vintageNum > currentYear + 1) {
        return NextResponse.json(
          { error: 'Invalid vintage year' },
          { status: 400 }
        )
      }
    }

    // Match wines from database
    const matchResult = await matchWines({
      producer,
      wine_name,
      vintage: vintage ? parseInt(vintage) : null,
      alcohol_percent: null
    })

    // If we have candidates, return them
    if (matchResult.candidates.length > 0) {
      return NextResponse.json({
        type: 'candidates',
        parsed: {
          producer,
          wine_name,
          vintage: vintage ? parseInt(vintage) : null,
          alcohol_percent: null,
          confidence: {
            producer: 1.0, // Manual entry has high confidence
            wine_name: 1.0,
            vintage: vintage ? 1.0 : 0,
            alcohol_percent: 0
          },
          raw_text: ''
        },
        candidates: matchResult.candidates,
        hasHighConfidence: matchResult.hasHighConfidenceMatch,
        source: 'manual'
      })
    }

    // No database match - allow AI search or manual creation
    return NextResponse.json({
      type: 'no_match',
      parsed: {
        producer,
        wine_name,
        vintage: vintage ? parseInt(vintage) : null,
        alcohol_percent: null,
        confidence: {
          producer: 1.0,
          wine_name: 1.0,
          vintage: vintage ? 1.0 : 0,
          alcohol_percent: 0
        },
        raw_text: ''
      },
      allowAiSearch: true,
      source: 'manual'
    })
  } catch (error) {
    console.error('Manual entry error:', error)
    return NextResponse.json(
      { error: 'Failed to process manual entry' },
      { status: 500 }
    )
  }
}

