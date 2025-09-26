// Test script to check wine list data directly
const { createServiceClient } = require('./src/lib/supabase/server.ts');

async function testWineLists() {
  try {
    const supabase = createServiceClient();
    
    // First, let's see what documents we have
    console.log('=== DOCUMENTS ===');
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, original_filename, extracted_content')
      .like('original_filename', '%worlds_best_wines%')
      .limit(5);
    
    if (docError) {
      console.error('Document error:', docError);
      return;
    }
    
    console.log('Found documents:', documents?.length || 0);
    documents?.forEach(doc => {
      console.log(`- ${doc.original_filename} (${doc.id})`);
      console.log(`  Content preview: ${doc.extracted_content?.substring(0, 100)}...`);
    });
    
    if (documents && documents.length > 0) {
      const docId = documents[0].id;
      
      // Now let's check the chunks for this document
      console.log('\n=== CHUNKS ===');
      const { data: chunks, error: chunkError } = await supabase
        .from('doc_chunks')
        .select('id, chunk')
        .eq('doc_id', docId)
        .order('id');
      
      if (chunkError) {
        console.error('Chunk error:', chunkError);
        return;
      }
      
      console.log(`Found ${chunks?.length || 0} chunks for document ${docId}`);
      chunks?.forEach((chunk, index) => {
        console.log(`Chunk ${index + 1}: ${chunk.chunk.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testWineLists();
