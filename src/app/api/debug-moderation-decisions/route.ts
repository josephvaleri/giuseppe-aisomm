import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get moderation decisions
    const { data: decisions, error } = await supabase
      .from('moderation_decisions')
      .select(`
        qa_id,
        decision,
        edited_answer,
        moderation_notes,
        questions_answers!inner(
          question,
          answer,
          source
        )
      `)
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      count: decisions?.length || 0,
      decisions: decisions?.map(d => ({
        qa_id: d.qa_id,
        decision: d.decision,
        has_edited_answer: !!d.edited_answer,
        question: d.questions_answers?.question,
        answer_length: d.questions_answers?.answer?.length,
        source: d.questions_answers?.source
      }))
    })

  } catch (error) {
    console.error('Error debugging moderation decisions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}








