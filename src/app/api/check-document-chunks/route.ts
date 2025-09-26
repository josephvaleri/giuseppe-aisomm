import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Check if document exists
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if document has chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('doc_chunks')
      .select('*')
      .eq('doc_id', documentId)

    if (chunksError) {
      return NextResponse.json({ error: 'Failed to fetch chunks', details: chunksError }, { status: 500 })
    }

    // Check if chunks have embeddings
    const chunksWithEmbeddings = chunks?.filter(chunk => chunk.embedding !== null) || []
    const chunksWithoutEmbeddings = chunks?.filter(chunk => chunk.embedding === null) || []

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.original_filename,
        processed: document.processed,
        file_size: document.file_size
      },
      chunks: {
        total: chunks?.length || 0,
        withEmbeddings: chunksWithEmbeddings.length,
        withoutEmbeddings: chunksWithoutEmbeddings.length
      },
      sampleChunks: chunks?.slice(0, 3).map(chunk => ({
        id: chunk.id,
        hasEmbedding: chunk.embedding !== null,
        contentPreview: chunk.chunk.substring(0, 100) + '...'
      })) || []
    })

  } catch (error) {
    console.error('Error in check-document-chunks API:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
