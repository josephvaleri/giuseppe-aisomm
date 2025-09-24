import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check recent Q&A records with feedback
    const { data: qaData, error: qaError } = await supabase
      .from('questions_answers')
      .select('qa_id, thumbs_up, created_at')
      .not('thumbs_up', 'is', null)
      .order('qa_id', { ascending: false })
      .limit(10)

    if (qaError) {
      console.error('QA query error:', qaError)
      return NextResponse.json({ error: 'Failed to query QA data' }, { status: 500 })
    }

    // Check moderation items
    const { data: moderationData, error: moderationError } = await supabase
      .from('moderation_items')
      .select('item_id, qa_id, status, created_at')
      .order('item_id', { ascending: false })
      .limit(10)

    if (moderationError) {
      console.error('Moderation query error:', moderationError)
      return NextResponse.json({ error: 'Failed to query moderation data' }, { status: 500 })
    }

    return NextResponse.json({
      qa_feedback: qaData,
      moderation_items: moderationData
    })

  } catch (error) {
    console.error('Debug feedback API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
