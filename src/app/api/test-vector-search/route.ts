import { NextRequest, NextResponse } from 'next/server'
import { embedText, vectorSearch } from '@/lib/rag/retrieval'

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json()
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    console.log(`Testing vector search for: "${question}"`)
    
    // Create embedding for the question
    const queryEmbedding = await embedText(question)
    console.log('Query embedding created, length:', queryEmbedding.length)
    
    // Perform vector search
    const documentResults = await vectorSearch(queryEmbedding, 5)
    console.log('Vector search results:', documentResults?.length || 0)
    
    // Return the results with scores and content previews
    const results = documentResults?.map(result => ({
      score: result.score,
      source: result.source,
      docId: result.doc_id,
      contentPreview: result.chunk.substring(0, 200) + '...',
      fullContent: result.chunk
    })) || []
    
    return NextResponse.json({
      question,
      resultsCount: results.length,
      results
    })

  } catch (error) {
    console.error('Error in test-vector-search API:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
