import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractQuestionFeatures, extractRetrievalFeatures } from '@/lib/ml/features'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get moderation decisions with Q&A data
    const { data: decisions, error: decisionsError } = await supabase
      .from('moderation_decisions')
      .select(`
        qa_id,
        decision,
        edited_answer,
        moderation_notes,
        questions_answers!inner(
          question,
          answer,
          source,
          retrieval_debug
        )
      `)

    if (decisionsError) {
      console.error('Error fetching moderation decisions:', decisionsError)
      return NextResponse.json({ error: 'Failed to fetch moderation decisions' }, { status: 500 })
    }

    if (!decisions || decisions.length === 0) {
      return NextResponse.json({ 
        message: 'No moderation decisions found. Please moderate some items first.',
        count: 0 
      })
    }

    console.log(`Found ${decisions.length} moderation decisions`)

    // Process each decision to create training examples
    const trainingExamples = []
    
    for (const decision of decisions) {
      const qa = decision.questions_answers
      if (!qa) continue

      try {
        // Extract features for different ML models
        const questionFeatures = extractQuestionFeatures(qa.question)
        
        // Create training examples for each model type
        const examples = await createTrainingExamples(
          decision.qa_id,
          qa.question,
          qa.answer,
          decision.decision,
          decision.edited_answer,
          questionFeatures,
          supabase
        )
        
        trainingExamples.push(...examples)
      } catch (error) {
        console.error(`Error processing decision ${decision.qa_id}:`, error)
        continue
      }
    }

    // Insert training examples
    if (trainingExamples.length > 0) {
      const { error: insertError } = await supabase
        .from('ml_training_examples')
        .insert(trainingExamples)

      if (insertError) {
        console.error('Error inserting training examples:', insertError)
        return NextResponse.json({ error: 'Failed to insert training examples' }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: `Successfully created ${trainingExamples.length} training examples`,
      count: trainingExamples.length,
      breakdown: {
        reranker: trainingExamples.filter(ex => ex.kind === 'reranker').length,
        route: trainingExamples.filter(ex => ex.kind === 'route').length,
        intent: trainingExamples.filter(ex => ex.kind === 'intent').length
      }
    })

  } catch (error) {
    console.error('Error in populate training data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function createTrainingExamples(
  qaId: number,
  question: string,
  answer: string,
  decision: string,
  editedAnswer: string | null,
  questionFeatures: any,
  supabase: any
) {
  const examples = []
  
  // Determine quality score based on moderation decision
  let qualityScore = 0.5 // neutral
  if (decision === 'accepted') {
    qualityScore = 0.9 // high quality
  } else if (decision === 'rejected') {
    qualityScore = 0.1 // low quality
  } else if (decision === 'edited') {
    qualityScore = 0.7 // medium quality (needed improvement)
  }

  // Create reranker training example
  examples.push({
    qa_id: qaId,
    kind: 'reranker',
    features: {
      question_length: question.length,
      answer_length: answer.length,
      source: answer.includes('database') ? 1 : 0,
      has_italian: answer.includes('*(') ? 1 : 0,
      has_grape_links: answer.includes('grape-link') ? 1 : 0,
      question_features: questionFeatures
    },
    label: qualityScore,
    meta: {
      decision,
      has_edit: editedAnswer ? 1 : 0
    }
  })

  // Create route training example
  examples.push({
    qa_id: qaId,
    kind: 'route',
    features: {
      question_features: questionFeatures,
      quality_score: qualityScore,
      source_preference: qualityScore > 0.7 ? 'db' : 'openai'
    },
    label: qualityScore > 0.7 ? 1 : 0, // 1 for database, 0 for OpenAI
    meta: {
      decision,
      original_source: answer.includes('database') ? 'db' : 'openai'
    }
  })

  // Create intent training example
  examples.push({
    qa_id: qaId,
    kind: 'intent',
    features: {
      question_features: questionFeatures,
      is_wine_related: questionFeatures.wine_keywords > 0 ? 1 : 0,
      is_food_pairing: question.toLowerCase().includes('pair') || 
                       question.toLowerCase().includes('go well') ? 1 : 0,
      is_region_query: question.toLowerCase().includes('region') ? 1 : 0
    },
    label: questionFeatures.wine_keywords > 0 ? 1 : 0, // 1 for wine-related, 0 for not
    meta: {
      decision,
      question_type: questionFeatures.wine_keywords > 0 ? 'wine' : 'other'
    }
  })

  return examples
}
