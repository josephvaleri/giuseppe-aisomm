import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log(`Debug processing document: ${document.original_filename}`)
    console.log(`Storage path: ${document.storage_path}`)
    console.log(`File size: ${document.file_size} bytes`)
    console.log(`MIME type: ${document.mime_type}`)

    // Download file content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ 
        error: 'Failed to download file', 
        details: downloadError,
        storagePath: document.storage_path
      }, { status: 500 })
    }

    console.log('File downloaded successfully, size:', fileData.size)

    // Try to extract text based on file type
    const fileName = document.original_filename.toLowerCase()
    let textContent = ''
    let extractionDetails = {}

    if (fileName.endsWith('.docx')) {
      try {
        const arrayBuffer = await fileData.arrayBuffer()
        console.log('ArrayBuffer size:', arrayBuffer.byteLength)
        
going in ape
        // Convert ArrayBuffer to Buffer for mammoth
        const buffer = Buffer.from(arrayBuffer)
        console.log('Buffer size:', buffer.length)
        
        // Try using Buffer instead of ArrayBuffer
        const result = await mammoth.extractRawText(buffer)
        textContent = result.value
        extractionDetails = {
          success: true,
          textLength: textContent.length,
          warnings: result.messages,
          extractedText: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '')
        }
        console.log('Mammoth extraction successful, text length:', textContent.length)
        console.log('Mammoth warnings:', result.messages)
      } catch (error) {
        console.error('Mammoth extraction error:', error)
        extractionDetails = {
          success: false,
          error: error.message,
          stack: error.stack
        }
        textContent = `Error extracting text from ${document.original_filename}: ${error.message}`
      }
    } else {
      textContent = `File type ${fileName} not supported for debug processing`
    }

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.original_filename,
        file_size: document.file_size,
        mime_type: document.mime_type,
        storage_path: document.storage_path
      },
      extractionDetails,
      extractedContent: textContent.substring(0, 1000) + (textContent.length > 1000 ? '...' : ''),
      fullTextLength: textContent.length
    })

  } catch (error) {
    console.error('Error in debug-process-document API:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
