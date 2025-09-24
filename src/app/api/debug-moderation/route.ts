import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get moderation items
    const { data: moderationItems, error: moderationError } = await supabase
      .from('moderation_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (moderationError) {
      console.error('Moderation query error:', moderationError)
      return NextResponse.json({ error: 'Failed to query moderation items' }, { status: 500 })
    }

    // Get recent Q&A with feedback
    const { data: qaData, error: qaError } = await supabase
      .from('questions_answers')
      .select('qa_id, question, answer, thumbs_up, created_at, user_id')
      .order('qa_id', { ascending: false })
      .limit(10)

    if (qaError) {
      console.error('QA query error:', qaError)
      return NextResponse.json({ error: 'Failed to query QA data' }, { status: 500 })
    }

    return NextResponse.json({
      moderation_items: moderationItems,
      recent_qa: qaData,
      moderation_count: moderationItems?.length || 0,
      qa_count: qaData?.length || 0
    })

  } catch (error) {
    console.error('Debug moderation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
