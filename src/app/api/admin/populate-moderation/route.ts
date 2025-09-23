import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role_id !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Find all Q&A records with NULL thumbs_up that don't have moderation items
    const { data: qaRecords, error: qaError } = await supabase
      .from('questions_answers')
      .select('qa_id')
      .is('thumbs_up', null)

    if (qaError) {
      console.error('QA query error:', qaError)
      return NextResponse.json({ error: 'Failed to query QA data' }, { status: 500 })
    }

    if (!qaRecords || qaRecords.length === 0) {
      return NextResponse.json({ 
        message: 'No Q&A records with NULL feedback found',
        count: 0
      })
    }

    // Check which ones already have moderation items
    const qaIds = qaRecords.map(record => record.qa_id)
    const { data: existingModeration, error: moderationError } = await supabase
      .from('moderation_items')
      .select('qa_id')
      .in('qa_id', qaIds)

    if (moderationError) {
      console.error('Moderation query error:', moderationError)
      return NextResponse.json({ error: 'Failed to query moderation data' }, { status: 500 })
    }

    const existingQaIds = existingModeration?.map(item => item.qa_id) || []
    const newQaIds = qaIds.filter(qaId => !existingQaIds.includes(qaId))

    if (newQaIds.length === 0) {
      return NextResponse.json({ 
        message: 'All Q&A records with NULL feedback already have moderation items',
        count: 0
      })
    }

    // Insert new moderation items
    const moderationItems = newQaIds.map(qaId => ({
      qa_id: qaId,
      status: 'pending'
    }))

    const { error: insertError } = await supabase
      .from('moderation_items')
      .insert(moderationItems)

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to insert moderation items' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Successfully added ${newQaIds.length} items to moderation queue`,
      count: newQaIds.length,
      qaIds: newQaIds
    })

  } catch (error) {
    console.error('Populate moderation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}