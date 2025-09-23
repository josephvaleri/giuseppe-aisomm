import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMLInference } from '@/lib/ml/infer'
import { loadEntityDictionaries, extractQuestionFeatures, extractRetrievalFeatures, extractRouteFeatures } from '@/lib/ml/features'
import { searchDocuments, synthesizeFromDB } from '@/lib/rag/retrieval'
import { GIUSEPPE_SYSTEM_PROMPT, getRandomItalianStarter, buildUserPrompt } from '@/lib/giuseppe/persona'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AskSchema = z.object({
  question: z.string().min(3).max(1000)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check trial status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, trial_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isTrialExpired = profile.trial_expires_at && new Date(profile.trial_expires_at) < new Date()
    const isStaff = ['moderator', 'admin'].includes(profile.role)
    
    if (isTrialExpired && profile.role !== 'user' && !isStaff) {
      return NextResponse.json({ error: 'Trial expired' }, { status: 402 })
    }

    const body = await request.json()
    const { question } = AskSchema.parse(body)

    // OpenAI moderation
    const moderationResponse = await openai.moderations.create({
      input: question
    })

    if (moderationResponse.results[0].flagged) {
      return NextResponse.json({
        avatarState: 'ERROR',
        answer: 'Domanda furba, ma usciamo dalla cantina. *(We\'re wandering outside the cellar.)*\n\nI can help best with wine, regions, grapes, pairings, and cellar tips. Ask me anything in that world!'
      })
    }

    // Load ML models and entity dictionaries
    const [mlInference, dicts] = await Promise.all([
      getMLInference(),
      loadEntityDictionaries()
    ])

    // Extract question features
    const questionFeatures = extractQuestionFeatures(question, dicts)

    // Predict intent
    const intentScores = await mlInference.predictIntent(questionFeatures)

    // Check for non-wine redirect
    if (await mlInference.shouldRedirectNonWine(intentScores)) {
      return NextResponse.json({
        avatarState: 'ERROR',
        answer: 'Domanda furba, ma usciamo dalla cantina. *(We\'re wandering outside the cellar.)*\n\nI can help best with wine, regions, grapes, pairings, and cellar tips. Ask me anything in that world!'
      })
    }

    // Retrieve relevant chunks
    const retrievedChunks = await searchDocuments(question, 6)
    
    // Extract retrieval features
    const retrievalFeatures = extractRetrievalFeatures(question, retrievedChunks, dicts)

    // Rerank candidates
    const rerankedChunks = await mlInference.rerankCandidates(
      question,
      retrievedChunks,
      questionFeatures,
      retrievalFeatures
    )

    // Try to answer from database first
    const dbResult = await synthesizeFromDB(question)
    const routeFeatures = extractRouteFeatures(questionFeatures, retrievalFeatures, dbResult.canAnswer)

    // Predict route
    const routeScore = await mlInference.predictRoute(questionFeatures, retrievalFeatures, routeFeatures)

    let answer: string
    let source: 'db' | 'openai' = 'openai'
    let avatarState: 'ANSWERING' | 'ERROR' = 'ANSWERING'

    if (routeScore > 0.7 && dbResult.canAnswer) {
      // Use database synthesis
      answer = dbResult.answer
      source = 'db'
    } else {
      // Use OpenAI with RAG
      try {
        const context = rerankedChunks.slice(0, 3).map(c => c.chunk)
        const userPrompt = buildUserPrompt(question, context)
        
        const completion = await openai.chat.completions.create({
          model: process.env.GIUSEPPE_OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: GIUSEPPE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: parseInt(process.env.GIUSEPPE_MAX_TOKENS || '800'),
          temperature: parseFloat(process.env.GIUSEPPE_TEMPERATURE || '0.7')
        })

        answer = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.'
      } catch (error) {
        console.error('OpenAI error:', error)
        avatarState = 'ERROR'
        answer = 'Mi dispiace, ho avuto un problema tecnico. *(I\'m sorry, I had a technical problem.)*\n\nPlease try asking your question again.'
      }
    }

    // Add Italian starter
    const starter = getRandomItalianStarter()
    const finalAnswer = `${starter.italian}\n${starter.english}\n\n${answer}`

    // Log the Q&A
    const { data: qaRecord } = await supabase
      .from('questions_answers')
      .insert({
        user_id: user.id,
        question,
        answer: finalAnswer,
        source,
        retrieval_debug: {
          intentScores,
          retrievalFeatures,
          routeScore,
          rerankedChunks: rerankedChunks.slice(0, 3).map(c => ({
            chunk: c.chunk.substring(0, 200) + '...',
            score: c.score,
            originalScore: c.originalScore
          }))
        }
      })
      .select('qa_id')
      .single()

    // Log ML events
    if (qaRecord) {
      await supabase
        .from('ml_events')
        .insert([
          {
            qa_id: qaRecord.qa_id,
            kind: 'intent_infer',
            input_features: questionFeatures,
            output: intentScores
          },
          {
            qa_id: qaRecord.qa_id,
            kind: 'rerank_infer',
            input_features: retrievalFeatures,
            output: rerankedChunks.slice(0, 3)
          },
          {
            qa_id: qaRecord.qa_id,
            kind: 'route_infer',
            input_features: routeFeatures,
            output: { routeScore, chosenRoute: source }
          }
        ])
    }

    return NextResponse.json({
      avatarState,
      answer: finalAnswer,
      qaId: qaRecord?.qa_id
    })

  } catch (error) {
    console.error('Ask API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid question format' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
