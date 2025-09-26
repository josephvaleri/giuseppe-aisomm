import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .order('upload_date', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Get doc_chunks count
    const { count: totalChunks } = await supabase
      .from('doc_chunks')
      .select('*', { count: 'exact', head: true })

    // Look specifically for General_wine_questions document
    const generalWineDoc = documents?.find(doc => 
      doc.original_filename?.toLowerCase().includes('general_wine') ||
      doc.original_filename?.toLowerCase().includes('general wine')
    )

    return NextResponse.json({
      totalDocuments: documents?.length || 0,
      totalChunks: totalChunks || 0,
      documents: documents?.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        original_filename: doc.original_filename,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        processed: doc.processed,
        upload_date: doc.upload_date,
        functional_area: doc.functional_area
      })),
      generalWineDocument: generalWineDoc ? {
        id: generalWineDoc.id,
        filename: generalWineDoc.filename,
        original_filename: generalWineDoc.original_filename,
        file_size: generalWineDoc.file_size,
        mime_type: generalWineDoc.mime_type,
        processed: generalWineDoc.processed,
        upload_date: generalWineDoc.upload_date,
        functional_area: generalWineDoc.functional_area,
        extracted_content: generalWineDoc.extracted_content?.substring(0, 500) + '...'
      } : null
    })

  } catch (error) {
    console.error('Error in debug-documents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
