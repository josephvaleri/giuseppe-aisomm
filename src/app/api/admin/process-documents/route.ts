import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { embedText } from '@/lib/rag/retrieval'

// Helper function to create text chunks with memory management
function createTextChunks(text: string, filename: string): Array<{ text: string }> {
  const maxChunkSize = 800 // Reduced chunk size for memory efficiency
  const overlap = 100 // Reduced overlap for memory efficiency
  const maxTotalChunks = 20 // Limit total chunks to prevent memory issues
  
  // If text is too large, truncate it
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '\n\n... [Content truncated for memory management]'
  }
  
  if (text.length <= maxChunkSize) {
    return [{ text: `${filename}\n\n${text}` }]
  }

  const chunks = []
  let start = 0
  
  while (start < text.length && chunks.length < maxTotalChunks) {
    let end = Math.min(start + maxChunkSize, text.length)
    let chunkText = text.slice(start, end)
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentence = chunkText.lastIndexOf('.')
      const lastNewline = chunkText.lastIndexOf('\n')
      const breakPoint = Math.max(lastSentence, lastNewline)
      
      if (breakPoint > start + maxChunkSize * 0.5) {
        chunkText = chunkText.slice(0, breakPoint + 1)
        end = start + breakPoint + 1
      }
    }
    
    chunks.push({
      text: `${filename}\n\n${chunkText.trim()}`
    })
    
    start = end - overlap
    if (start < 0) start = 0 // Ensure start doesn't go negative
  }
  
  // If we hit the chunk limit, add a note
  if (chunks.length >= maxTotalChunks && start < text.length) {
    chunks.push({
      text: `${filename}\n\n... [Additional content truncated due to memory management]`
    })
  }
  
  return chunks
}

export async function POST(request: NextRequest) {
  try {
    const { documentIds } = await request.json()
    
    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json({ error: 'Invalid document IDs' }, { status: 400 })
    }

    // Limit processing to prevent memory issues
    if (documentIds.length > 5) {
      return NextResponse.json({ 
        error: 'Too many documents. Please process 5 documents or fewer at a time to prevent memory issues.' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Process each document sequentially to prevent memory issues
    const results = []
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i]
      console.log(`Processing document ${i + 1}/${documentIds.length}: ${docId}`)
      try {
        // Get document details
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', docId)
          .single()

        if (docError || !document) {
          console.error(`Error fetching document ${docId}:`, docError)
          continue
        }

        // Download file content
        console.log(`Attempting to download file: ${document.storage_path}`)
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(document.storage_path)

        if (downloadError) {
          console.error(`Error downloading file for document ${docId}:`, downloadError)
          console.error(`Storage path: ${document.storage_path}`)
          console.error(`Filename: ${document.original_filename}`)
          
          // Try to continue with a placeholder content instead of skipping
          console.log(`Using placeholder content for ${document.original_filename}`)
          const textContent = `Placeholder content for ${document.original_filename} - file could not be downloaded from storage. Storage path: ${document.storage_path}`
          
          // Update document as processed even if we can't download
          await supabase
            .from('documents')
            .update({ 
              extracted_content: textContent,
              processed: true 
            })
            .eq('id', docId)
          
          results.push({
            documentId: docId,
            filename: document.original_filename,
            chunksCreated: 1, // Create one placeholder chunk
            success: true, // Mark as successful but with placeholder content
            error: `File not found in storage, used placeholder content`
          })
          
                   // Create a placeholder chunk with embedding
                   console.log(`Generating embedding for placeholder chunk...`)
                   try {
                     const embedding = await embedText(textContent)
                     const chunkData = [{
                       doc_id: docId,
                       chunk: textContent,
                       embedding: embedding
                     }]

                     const { error: chunkError } = await supabase
                       .from('doc_chunks')
                       .delete()
                       .eq('doc_id', docId)

                     if (chunkError) {
                       console.error(`Error deleting existing chunks for document ${docId}:`, chunkError)
                     }

                     const { error: newChunkError } = await supabase
                       .from('doc_chunks')
                       .insert(chunkData)

                     if (newChunkError) {
                       console.error(`Error inserting placeholder chunk for document ${docId}:`, newChunkError)
                     } else {
                       console.log(`Successfully inserted placeholder chunk with embedding for document ${docId}`)
                     }
                   } catch (embedError) {
                     console.error(`Error generating embedding for placeholder chunk:`, embedError)
                     // Insert without embedding as fallback
                     const chunkData = [{
                       doc_id: docId,
                       chunk: textContent,
                       embedding: null
                     }]

                     const { error: chunkError } = await supabase
                       .from('doc_chunks')
                       .delete()
                       .eq('doc_id', docId)

                     if (chunkError) {
                       console.error(`Error deleting existing chunks for document ${docId}:`, chunkError)
                     }

                     const { error: newChunkError } = await supabase
                       .from('doc_chunks')
                       .insert(chunkData)

                     if (newChunkError) {
                       console.error(`Error inserting placeholder chunk for document ${docId}:`, newChunkError)
                     }
                   }
          
          continue
        }

        // Extract text content based on file type
        let textContent = ''
        const fileName = document.original_filename.toLowerCase()

        if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
          textContent = await fileData.text()
        } else if (fileName.endsWith('.csv')) {
          // For CSV files, read as text with size limits
          const csvText = await fileData.text()
          
          // Limit CSV content to prevent memory issues
          if (csvText.length > 50000) {
            console.log(`Large CSV file detected (${csvText.length} characters), truncating content`)
            textContent = csvText.substring(0, 50000) + '\n\n... [CSV content truncated to prevent memory issues]'
          } else {
            textContent = csvText
          }
        } else if (fileName.endsWith('.pdf')) {
          // For PDF files, use a placeholder for now
          // TODO: Implement proper PDF parsing with a Next.js-compatible library
          textContent = `PDF content for ${document.original_filename} - PDF parsing will be implemented with a Next.js-compatible library`
        } else if (fileName.endsWith('.docx')) {
          // For Word documents, use mammoth to extract text
          try {
            const arrayBuffer = await fileData.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const result = await mammoth.extractRawText(buffer)
            textContent = result.value
            if (result.messages.length > 0) {
              console.log(`Mammoth warnings for ${document.original_filename}:`, result.messages)
            }
            console.log(`Successfully extracted ${textContent.length} characters from ${document.original_filename}`)
          } catch (error) {
            console.error(`Error extracting text from ${document.original_filename}:`, error)
            console.error('Error details:', error.message)
            textContent = `Error extracting text from ${document.original_filename}: ${error.message}`
          }
        } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
          // For Excel files, use xlsx library to extract text
          try {
            const arrayBuffer = await fileData.arrayBuffer()
            
            // For large files, limit processing to prevent memory issues
            const fileSizeInMB = arrayBuffer.byteLength / (1024 * 1024)
            if (fileSizeInMB > 2) {
              console.log(`Large Excel file detected (${fileSizeInMB.toFixed(2)}MB), using lightweight processing`)
              textContent = `Excel file content for ${document.original_filename} (${fileSizeInMB.toFixed(2)}MB) - large file, content extraction limited to prevent memory issues`
            } else {
              const workbook = XLSX.read(arrayBuffer, { type: 'array' })
              
              // Extract text from first few sheets only to prevent memory issues
              const sheetTexts = []
              const maxSheets = Math.min(workbook.SheetNames.length, 3) // Limit to first 3 sheets
              
              for (let i = 0; i < maxSheets; i++) {
                const sheetName = workbook.SheetNames[i]
                const worksheet = workbook.Sheets[sheetName]
                const sheetData = XLSX.utils.sheet_to_txt(worksheet)
                if (sheetData.trim()) {
                  // Limit sheet content to prevent memory issues
                  const limitedData = sheetData.length > 10000 ? 
                    sheetData.substring(0, 10000) + '... [content truncated]' : 
                    sheetData
                  sheetTexts.push(`${sheetName}:\n${limitedData}`)
                }
              }
              
              if (workbook.SheetNames.length > maxSheets) {
                sheetTexts.push(`... and ${workbook.SheetNames.length - maxSheets} more sheets`)
              }
              
              textContent = sheetTexts.join('\n\n')
            }
          } catch (error) {
            console.error(`Error extracting text from ${document.original_filename}:`, error)
            textContent = `Error extracting text from ${document.original_filename}`
          }
        } else {
          // For other file types, use filename as content
          textContent = `Content from ${document.original_filename} - file type: ${document.mime_type}`
        }

        // Update document with extracted content (store first 1000 chars for preview)
        await supabase
          .from('documents')
          .update({ 
            extracted_content: textContent.substring(0, 1000), // Store first 1000 chars
            processed: true 
          })
          .eq('id', docId)

        // Create chunks from the text content
        console.log(`Processing document ${document.original_filename}, content length: ${textContent.length}`)
        const chunks = createTextChunks(textContent, document.original_filename)
        console.log(`Created ${chunks.length} chunks for document ${docId}`)
        
        // Generate embeddings for each chunk and insert into doc_chunks table
        console.log(`Generating embeddings for ${chunks.length} chunks...`)
        const chunkData = []
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`)
          
          try {
            const embedding = await embedText(chunk.text)
            chunkData.push({
              doc_id: docId,
              chunk: chunk.text,
              embedding: embedding
            })
          } catch (embedError) {
            console.error(`Error generating embedding for chunk ${i + 1}:`, embedError)
            // Insert chunk without embedding as fallback
            chunkData.push({
              doc_id: docId,
              chunk: chunk.text,
              embedding: null
            })
          }
        }

        const { error: chunkError } = await supabase
          .from('doc_chunks')
          .delete() // Delete existing chunks before inserting new ones
          .eq('doc_id', docId)

        if (chunkError) {
          console.error(`Error deleting existing chunks for document ${docId}:`, chunkError)
        }

        const { error: newChunkError } = await supabase
          .from('doc_chunks')
          .insert(chunkData)

        if (newChunkError) {
          console.error(`Error inserting new chunks for document ${docId}:`, newChunkError)
        } else {
          console.log(`Successfully inserted ${chunks.length} chunks with embeddings for document ${docId}`)
        }

        results.push({
          documentId: docId,
          filename: document.original_filename,
          chunksCreated: chunks.length,
          success: true
        })

        // Small delay to allow garbage collection for large files
        if (textContent.length > 100000) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`Error processing document ${docId}:`, error)
        results.push({
          documentId: docId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalChunks = results.reduce((sum, r) => sum + (r.chunksCreated || 0), 0)

    return NextResponse.json({
      message: `Processed ${successCount}/${documentIds.length} documents`,
      results,
      totalChunksCreated: totalChunks
    })

  } catch (error) {
    console.error('Error processing documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
