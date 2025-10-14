import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get training examples
    const { data: examples, error } = await supabase
      .from('ml_training_examples')
      .select('*')
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      count: examples?.length || 0,
      examples: examples?.map(ex => ({
        id: ex.id,
        kind: ex.kind,
        features_length: Array.isArray(ex.features) ? ex.features.length : 'not array',
        features_type: typeof ex.features,
        features_sample: Array.isArray(ex.features) ? ex.features.slice(0, 3) : ex.features,
        label: ex.label,
        meta: ex.meta
      }))
    })

  } catch (error) {
    console.error('Error debugging training data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}








