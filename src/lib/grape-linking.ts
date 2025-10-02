import { createClient } from '@/lib/supabase/client'

export interface GrapeInfo {
  grape_id: number
  grape_variety: string
  wine_color: string
  notable_wines: string
  flavor: string
  image_url?: string
  appellations: string[]
}

export interface GrapeMatch {
  grape_variety: string
  confidence: number
  grape_id: number
}

// Function to detect grape names in text with bulletproof logic
export function detectGrapeNames(text: string, grapeVarieties: string[]): GrapeMatch[] {
  const matches: GrapeMatch[] = []
  const processedText = text.toLowerCase()
  
  // Sort grapes by length (longest first) to prioritize multi-word grapes
  const sortedGrapes = grapeVarieties.sort((a, b) => b.length - a.length)
  
  for (const grape of sortedGrapes) {
    const cleanGrape = grape.toLowerCase()
    const regex = new RegExp(`\\b${cleanGrape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    
    // Check if this grape exists in the text
    if (regex.test(text)) {
      // Mark this grape as found
      matches.push({
        grape_variety: grape,
        confidence: 1.0,
        grape_id: 0 // Will be filled in later
      })
      
      // CRITICAL: Remove this grape from the text to prevent partial matches
      // This prevents "Moscato" from being detected when "Moscato Rosa" is already found
      text = text.replace(regex, '___PLACEHOLDER___')
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueMatches = matches.filter((match, index, self) => 
    index === self.findIndex(m => m.grape_variety === match.grape_variety)
  ).sort((a, b) => b.confidence - a.confidence)
  
  return uniqueMatches
}

// Simple similarity calculation (Levenshtein distance based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Function to get all grape varieties from database
export async function getAllGrapeVarieties(): Promise<string[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('grapes')
    .select('grape_variety')
  
  if (error) {
    console.error('Error fetching grape varieties:', error)
    return []
  }
  
  return data?.map(g => g.grape_variety) || []
}

// Function to get detailed grape information
export async function getGrapeInfo(grapeId: number): Promise<GrapeInfo | null> {
  const supabase = createClient()
  
  // Get grape basic info
  const { data: grapeData, error: grapeError } = await supabase
    .from('grapes')
    .select('*')
    .eq('grape_id', grapeId)
    .single()
  
  if (grapeError || !grapeData) {
    console.error('Error fetching grape info:', grapeError)
    return null
  }
  
  // Get grape image
  const { data: imageData, error: imageError } = await supabase
    .from('grape_images')
    .select('image_urls')
    .eq('grape_id', grapeId)
    .single()
  
  if (imageError) {
    console.log('No image found for grape_id:', grapeId, imageError)
  }
  
  // Get appellations - with better error handling
  let appellations: string[] = []
  
  try {
    const { data: appellationData, error: appellationError } = await supabase
      .from('join_grape_appellation')
      .select('appellation_id')
      .eq('grape_id', grapeId)
    
    if (appellationError) {
      console.log('Join table error for grape_id:', grapeId, appellationError)
    } else if (appellationData && appellationData.length > 0) {
      // Get appellation names separately
      const appellationIds = appellationData.map(item => item.appellation_id)
      
      const { data: appellationNames, error: namesError } = await supabase
        .from('appellation')
        .select('appellation')
        .in('appellation_id', appellationIds)
      
      if (namesError) {
        console.log('Appellations table error for grape_id:', grapeId, namesError)
      } else {
        appellations = appellationNames?.map(item => item.appellation) || []
      }
    }
  } catch (error) {
    console.log('Appellation query failed for grape_id:', grapeId, error)
  }
  
  return {
    grape_id: grapeData.grape_id,
    grape_variety: grapeData.grape_variety,
    wine_color: grapeData.wine_color,
    notable_wines: grapeData.notable_wines,
    flavor: grapeData.flavor,
    image_url: imageData?.image_urls,
    appellations
  }
}

// Function to create clickable links in text
export async function createGrapeLinks(text: string, grapeMatches: GrapeMatch[]): Promise<string> {
  // Skip grape linking if text already contains HTML tags or grape links (to prevent double-processing)
  if (/<[^>]+>/g.test(text) || text.includes('data-grape') || text.includes('grape-link')) {
    return text
  }
  
  let linkedText = text
  
  // Get grape IDs for matches
  const supabase = createClient()
  const matchesWithIds = await Promise.all(
    grapeMatches.map(async (match) => {
      const { data } = await supabase
        .from('grapes')
        .select('grape_id')
        .eq('grape_variety', match.grape_variety)
        .single()
      return { ...match, grape_id: data?.grape_id || 0 }
    })
  )
  
  // Sort matches by length (longest first) to avoid partial replacements
  const sortedMatches = matchesWithIds.sort((a, b) => b.grape_variety.length - a.grape_variety.length)
  
  for (const match of sortedMatches) {
    if (match.grape_id > 0) {
      // Use a more robust approach for multi-word grape names
      const escapedGrapeName = match.grape_variety.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Use word boundaries that work better with multi-word phrases
      const regex = new RegExp(`(^|[^\\w])${escapedGrapeName}([^\\w]|$)`, 'gi')
      const replacement = `$1<span class="grape-link" data-grape-id="${match.grape_id}" style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">${match.grape_variety}</span>$2`
      linkedText = linkedText.replace(regex, replacement)
    }
  }
  
  return linkedText
}
