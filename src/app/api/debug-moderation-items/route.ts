import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get moderation items
    const { data: items, error } = await supabase
      .from('moderation_items')
      .select(`
        qa_id,
        status,
        questions_answers!inner(
          question,
          answer,
          source,
          thumbs_up
        )
      `)
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      count: items?.length || 0,
      items: items?.map(item => ({
        qa_id: item.qa_id,
        status: item.status,
        question: item.questions_answers?.question,
        thumbs_up: item.questions_answers?.thumbs_up,
        source: item.questions_answers?.source
      }))
    })

  } catch (error) {
    console.error('Error debugging moderation items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
