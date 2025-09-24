import { createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { searchGrapesByCountry, searchGrapesByRegion, formatGrapeResults } from './country-grape-search'
import { searchWinesByRegion, searchWinesByCountryRegion, formatWineResults } from './region-wine-search'

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
  const lowerQuestion = question.toLowerCase()
  
  // Country/Region grape queries - check for "grapes used in [country]" or "grapes used in [region] of [country]"
  const countryGrapePattern = /grapes.*?(?:used in|grown in|found in|commonly used in|in)\s+([A-Za-z\s]+?)(?:\s+of\s+([A-Za-z\s]+))?/i
  
  // Also check for simpler patterns like "grapes in [country]"
  const simpleCountryPattern = /grapes\s+(?:in|from)\s+([A-Za-z\s]+)/i
  
  // Simple country detection - just look for country names after "grapes"
  const simpleCountryDetection = /grapes.*?(?:in|from|used in|grown in|found in|commonly used in)\s+([A-Za-z\s]+?)(?:\?|$)/i
  
  const countryMatch = question.match(countryGrapePattern)
  const simpleMatch = question.match(simpleCountryPattern)
  const countryDetection = question.match(simpleCountryDetection)
  
  console.log('Question:', question)
  console.log('Country match:', countryMatch)
  console.log('Simple match:', simpleMatch)
  console.log('Country detection:', countryDetection)
  
  if (countryMatch || simpleMatch || countryDetection) {
    let regionName, countryName
    
    // Prioritize countryDetection as it's working correctly
    if (countryDetection) {
      countryName = countryDetection[1]?.trim()
      regionName = null
    } else if (countryMatch) {
      regionName = countryMatch[1]?.trim()
      countryName = countryMatch[2]?.trim() || countryMatch[1]?.trim()
    } else if (simpleMatch) {
      countryName = simpleMatch[1]?.trim()
      regionName = null
    }
    
    console.log('Region name:', regionName)
    console.log('Country name:', countryName)
    
    if (countryName) {
      try {
        let grapeResults
        if (regionName && countryName !== regionName) {
          // Region of country query
          console.log('Searching for region grapes:', regionName, 'in', countryName)
          grapeResults = await searchGrapesByRegion(countryName, regionName)
        } else {
          // Country query
          console.log('Searching for country grapes:', countryName)
          grapeResults = await searchGrapesByCountry(countryName)
        }
        
        console.log('Grape results:', grapeResults.length, 'grapes found')
        
        if (grapeResults.length > 0) {
          const answer = formatGrapeResults(grapeResults, countryName, regionName !== countryName ? regionName : undefined)
          console.log('Returning country-specific answer')
          return { answer, canAnswer: true }
        } else {
          console.log('No grapes found for country/region')
        }
      } catch (error) {
        console.error('Error in country grape search:', error)
      }
    }
  }

  // Wine region queries - check for "wines from [region]" or "wines from [region] of [country]"
  const wineRegionPattern = /wines.*?(?:from|in|of)\s+([A-Za-z]+?)(?:\s+region\s+of\s+([A-Za-z\s]+))?/i
  const simpleWineRegionPattern = /wines\s+(?:from|in)\s+([A-Za-z]+)/i
  const wineRegionDetection = /wines.*?(?:from|in|of)\s+([A-Za-z]+?)(?:\s+region\s+of\s+([A-Za-z\s]+))?/i
  
  // Specific pattern for "region of" queries
  const regionOfPattern = /wines.*?(?:from|in|of)\s+([A-Za-z]+)\s+region\s+of\s+([A-Za-z\s]+)/i

  const wineRegionMatch = question.match(wineRegionPattern)
  const simpleWineRegionMatch = question.match(simpleWineRegionPattern)
  const wineRegionDetectionMatch = question.match(wineRegionDetection)
  const regionOfMatch = question.match(regionOfPattern)

  console.log('Wine region match:', wineRegionMatch)
  console.log('Simple wine region match:', simpleWineRegionMatch)
  console.log('Wine region detection:', wineRegionDetectionMatch)
  console.log('Region of match:', regionOfMatch)

  if (wineRegionMatch || simpleWineRegionMatch || wineRegionDetectionMatch || regionOfMatch) {
    let regionName, countryName

    // Prioritize the specific "region of" pattern
    if (regionOfMatch) {
      regionName = regionOfMatch[1]?.trim()
      countryName = regionOfMatch[2]?.trim() || null
    } else if (wineRegionDetectionMatch) {
      regionName = wineRegionDetectionMatch[1]?.trim()
      countryName = wineRegionDetectionMatch[2]?.trim() || null
    } else if (wineRegionMatch) {
      regionName = wineRegionMatch[1]?.trim()
      countryName = wineRegionMatch[2]?.trim() || null
    } else if (simpleWineRegionMatch) {
      regionName = simpleWineRegionMatch[1]?.trim()
      countryName = null
    }

    console.log('Wine region name:', regionName)
    console.log('Wine country name:', countryName)

    if (regionName) {
      try {
        let wineResults
        if (countryName && countryName !== regionName) {
          // Region of country query
          console.log('Searching for region wines:', regionName, 'of', countryName)
          wineResults = await searchWinesByCountryRegion(countryName, regionName)
        } else {
          // Region query
          console.log('Searching for region wines:', regionName)
          wineResults = await searchWinesByRegion(regionName)
        }

        console.log('Wine results:', wineResults.length, 'wines found')

        if (wineResults.length > 0) {
          const answer = formatWineResults(wineResults, regionName, countryName)
          console.log('Returning region-specific wine answer')
          return { answer, canAnswer: true }
        } else {
          console.log('No wines found for region')
        }
      } catch (error) {
        console.error('Error in wine region search:', error)
      }
    }
  }
  
  // Enhanced grape queries - check for specific grape names
  if (lowerQuestion.includes('grape') || lowerQuestion.includes('variety') || 
      lowerQuestion.includes('chardonnay') || lowerQuestion.includes('cabernet') || 
      lowerQuestion.includes('merlot') || lowerQuestion.includes('pinot') ||
      lowerQuestion.includes('sauvignon') || lowerQuestion.includes('riesling')) {
    
    // Try to find specific grape first
    const grapeKeywords = ['chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon', 'riesling', 'syrah', 'malbec']
    const foundKeyword = grapeKeywords.find(keyword => lowerQuestion.includes(keyword))
    
    let grapes
    if (foundKeyword) {
      // Search for specific grape
      const { data } = await supabase
        .from('grapes')
        .select('*')
        .ilike('grape_variety', `%${foundKeyword}%`)
        .limit(3)
      grapes = data
    } else {
      // Get general grape info
      const { data } = await supabase
        .from('grapes')
        .select('*')
        .limit(5)
      grapes = data
    }
    
    if (grapes && grapes.length > 0) {
      const answer = `Here's what I found about grape varieties:\n\n` +
        grapes.map((g: any) => 
          `**${g.grape_variety}** (${g.wine_color})\n` +
          `Flavor profile: ${g.flavor || 'Not specified'}\n` +
          `Notable wines: ${g.notable_wines || 'Various'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  // Enhanced appellation queries
  if (lowerQuestion.includes('appellation') || lowerQuestion.includes('region') ||
      lowerQuestion.includes('chianti') || lowerQuestion.includes('burgundy') ||
      lowerQuestion.includes('bordeaux') || lowerQuestion.includes('napa')) {
    
    const { data: appellations } = await supabase
      .from('appellation')
      .select('*')
      .limit(5)
    
    if (appellations && appellations.length > 0) {
      const answer = `Here are some appellations I found:\n\n` +
        appellations.map((a: any) => 
          `**${a.appellation}**\n` +
          `Classification: ${a.classification || 'Not specified'}\n` +
          `Founded: ${a.founded_year || 'Unknown'}\n` +
          `Major grapes: ${a.major_grapes || 'Various'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  // Enhanced wine queries
  if (lowerQuestion.includes('wine') || lowerQuestion.includes('producer') || 
      lowerQuestion.includes('vintage') || lowerQuestion.includes('bottle')) {
    
    const { data: wines } = await supabase
      .from('wine')
      .select('*')
      .limit(5)
    
    if (wines && wines.length > 0) {
      const answer = `Here are some wines I found:\n\n` +
        wines.map((w: any) => 
          `**${w.wine_name}** by ${w.producer}\n` +
          `Vintage: ${w.vintage || 'NV'}\n` +
          `Color: ${w.color || 'Not specified'}\n` +
          `Alcohol: ${w.alcohol || 'Not specified'}\n`
        ).join('\n')
      
      return { answer, canAnswer: true }
    }
  }
  
  // Check for food pairing queries
  if (lowerQuestion.includes('pair') || lowerQuestion.includes('pairing') || 
      lowerQuestion.includes('goes with') || lowerQuestion.includes('match') ||
      lowerQuestion.includes('pasta') || lowerQuestion.includes('steak') ||
      lowerQuestion.includes('cheese') || lowerQuestion.includes('fish')) {
    
    // Try to find relevant grapes for pairing
    const { data: grapes } = await supabase
      .from('grapes')
      .select('grape_variety, wine_color, flavor')
      .limit(3)
    
    if (grapes && grapes.length > 0) {
      const answer = `For food pairing, here are some excellent grape varieties to consider:\n\n` +
        grapes.map((g: any) => 
          `**${g.grape_variety}** (${g.wine_color})\n` +
          `Flavor profile: ${g.flavor || 'Not specified'}\n`
        ).join('\n') +
        `\nThese varieties offer great versatility for food pairing!`
      
      return { answer, canAnswer: true }
    }
  }
  
  return { answer: '', canAnswer: false }
}
