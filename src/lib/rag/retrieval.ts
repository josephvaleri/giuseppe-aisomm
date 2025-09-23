import { createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface RetrievalResult {
  chunk: string
  score: number
  doc_id?: string
  source?: string
}

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-large',
    input: text
  })
  
  return response.data[0].embedding
}

export async function vectorSearch(
  queryEmbedding: number[],
  limit = 6
): Promise<RetrievalResult[]> {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit
  })

  if (error) {
    console.error('Vector search error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    chunk: item.chunk,
    score: item.score,
    doc_id: item.doc_id
  }))
}

export async function searchDocuments(
  query: string,
  limit = 6
): Promise<RetrievalResult[]> {
  const queryEmbedding = await embedText(query)
  return vectorSearch(queryEmbedding, limit)
}

export async function chunkDocument(
  content: string,
  chunkSize = 1000,
  overlap = 200
): Promise<string[]> {
  const chunks: string[] = []
  let start = 0
  
  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length)
    let chunk = content.slice(start, end)
    
    // Try to break at sentence boundaries
    if (end < content.length) {
      const lastSentence = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastSentence, lastNewline)
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = content.slice(start, start + breakPoint + 1)
        start = start + breakPoint + 1 - overlap
      } else {
        start = end - overlap
      }
    } else {
      start = end
    }
    
    chunks.push(chunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 50)
}

export async function embedAndStoreChunks(
  docId: string,
  content: string
): Promise<void> {
  const supabase = createServiceClient()
  const chunks = await chunkDocument(content)
  
  for (const chunk of chunks) {
    const embedding = await embedText(chunk)
    
    await supabase
      .from('doc_chunks')
      .insert({
        doc_id: docId,
        chunk,
        embedding
      })
  }
}

export async function synthesizeFromDB(
  question: string
): Promise<{ answer: string; canAnswer: boolean }> {
  const supabase = createServiceClient()
  
  // Try to answer from structured data using joins
  const lowerQuestion = question.toLowerCase()
  
  // Check for appellation queries
  if (lowerQuestion.includes('appellation') || lowerQuestion.includes('region')) {
    const { data: appellations } = await supabase
      .from('appellation')
      .select(`
        appellation,
        classification,
        founded_year,
        major_grapes,
        countries_regions!inner(country_name, wine_region)
      `)
      .limit(5)
    
    if (appellations && appellations.length > 0) {
      const answer = `Here are some appellations I found:\n\n` +
        appellations.map((a: any) => 
          `**${a.appellation}** (${a.countries_regions.country_name}, ${a.countries_regions.wine_region})\n` +
          `Classification: ${a.classification || 'Not specified'}\n` +
          `Founded: ${a.founded_year || 'Unknown'}\n` +
          `Major grapes: ${a.major_grapes || 'Various'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  // Check for grape queries
  if (lowerQuestion.includes('grape') || lowerQuestion.includes('variety')) {
    const { data: grapes } = await supabase
      .from('grapes')
      .select('grape_variety, wine_color, flavor, notable_wines')
      .limit(5)
    
    if (grapes && grapes.length > 0) {
      const answer = `Here are some grape varieties I found:\n\n` +
        grapes.map((g: any) => 
          `**${g.grape_variety}** (${g.wine_color})\n` +
          `Flavor profile: ${g.flavor || 'Not specified'}\n` +
          `Notable wines: ${g.notable_wines || 'Various'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  // Check for wine queries
  if (lowerQuestion.includes('wine') && (lowerQuestion.includes('producer') || lowerQuestion.includes('vintage'))) {
    const { data: wines } = await supabase
      .from('wines')
      .select(`
        wine_name,
        producer,
        vintage,
        color,
        alcohol,
        appellation!inner(appellation),
        countries_regions!inner(country_name, wine_region)
      `)
      .limit(5)
    
    if (wines && wines.length > 0) {
      const answer = `Here are some wines I found:\n\n` +
        wines.map((w: any) => 
          `**${w.wine_name}** by ${w.producer}\n` +
          `Vintage: ${w.vintage || 'NV'}\n` +
          `Color: ${w.color || 'Not specified'}\n` +
          `Region: ${w.countries_regions.wine_region}, ${w.countries_regions.country_name}\n` +
          `Appellation: ${w.appellation.appellation}\n` +
          `Alcohol: ${w.alcohol || 'Not specified'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  return { answer: '', canAnswer: false }
}
