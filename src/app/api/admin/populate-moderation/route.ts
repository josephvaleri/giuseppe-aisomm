import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all questions_answers entries that have thumbs_up = false but no moderation item
    const { data: qaEntries, error: qaError } = await supabase
      .from('questions_answers')
      .select('qa_id, question, answer, thumbs_up')
      .eq('thumbs_up', false)

    if (qaError) {
      console.error('Error fetching Q&A entries:', qaError)
      return NextResponse.json({ error: 'Failed to fetch Q&A entries' }, { status: 500 })
    }

    if (!qaEntries || qaEntries.length === 0) {
      return NextResponse.json({ 
        message: 'No negative feedback entries found to moderate',
        count: 0
      })
    }

    // Check which ones already have moderation items
    const qaIds = qaEntries.map(qa => qa.qa_id)
    const { data: existingModeration } = await supabase
      .from('moderation_items')
      .select('qa_id')
      .in('qa_id', qaIds)

    const existingQaIds = new Set(existingModeration?.map(m => m.qa_id) || [])
    const newModerationItems = qaEntries
      .filter(qa => !existingQaIds.has(qa.qa_id))
      .map(qa => ({
        qa_id: qa.qa_id,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      }))

    if (newModerationItems.length === 0) {
      return NextResponse.json({ 
        message: 'All negative feedback entries already have moderation items',
        count: 0
      })
    }

    // Insert new moderation items
    const { error: insertError } = await supabase
      .from('moderation_items')
      .insert(newModerationItems)

    if (insertError) {
      console.error('Error inserting moderation items:', insertError)
      return NextResponse.json({ error: 'Failed to insert moderation items' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Successfully created ${newModerationItems.length} moderation items`,
      count: newModerationItems.length
    })

  } catch (error) {
    console.error('Populate moderation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
