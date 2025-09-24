import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FeedbackSchema = z.object({
  qaId: z.number(),
  thumbsUp: z.boolean()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { qaId, thumbsUp } = FeedbackSchema.parse(body)

    // Update the Q&A record with feedback
    const { error: updateError } = await supabase
      .from('questions_answers')
      .update({ thumbs_up: thumbsUp })
      .eq('qa_id', qaId)
      .eq('user_id', user.id) // Ensure user can only update their own feedback

    if (updateError) {
      console.error('Feedback update error:', updateError)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    // Handle moderation queue based on feedback
    if (!thumbsUp) {
      // If thumbs down, create moderation item if it doesn't exist
      const { data: existingModeration } = await supabase
        .from('moderation_items')
        .select('item_id')
        .eq('qa_id', qaId)
        .single()

      if (!existingModeration) {
        const { error: insertError } = await supabase
          .from('moderation_items')
          .insert({
            qa_id: qaId,
            status: 'pending'
          })
        
        if (insertError) {
          console.error('Failed to create moderation item:', insertError)
        }
      }
    } else {
      // If thumbs up, remove from moderation queue (no longer needs review)
      const { error: deleteError } = await supabase
        .from('moderation_items')
        .delete()
        .eq('qa_id', qaId)
        .eq('status', 'pending')
      
      if (deleteError) {
        console.error('Failed to remove moderation item:', deleteError)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Feedback API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid feedback format' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
