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

    // Get moderation decisions with Q&A data for model retraining
    const { data: decisions, error: decisionsError } = await supabase
      .from('moderation_decisions')
      .select(`
        id,
        qa_id,
        decision,
        edited_answer,
        moderation_notes,
        created_at,
        questions_answers!moderation_decisions_qa_id_fkey(
          question,
          answer,
          user_id
        )
      `)
      .order('created_at', { ascending: false })

    if (decisionsError) {
      console.error('Decisions query error:', decisionsError)
      return NextResponse.json({ error: 'Failed to query moderation decisions' }, { status: 500 })
    }

    // Format data for model retraining
    const trainingData = decisions?.map(decision => ({
      qa_id: decision.qa_id,
      question: decision.questions_answers?.question,
      original_answer: decision.questions_answers?.answer,
      moderator_decision: decision.decision,
      edited_answer: decision.edited_answer,
      moderation_notes: decision.moderation_notes,
      moderated_at: decision.created_at,
      user_id: decision.questions_answers?.user_id
    })) || []

    return NextResponse.json({
      total_decisions: trainingData.length,
      decisions: trainingData,
      export_date: new Date().toISOString(),
      description: 'Moderation decisions for model retraining'
    })

  } catch (error) {
    console.error('Export moderation decisions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
