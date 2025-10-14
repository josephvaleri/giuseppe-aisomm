/**
 * OCR and parsing utilities for wine label text extraction
 * Extracts producer, wine_name, vintage, and alcohol_percent from label images
 */

// Using OpenAI Vision API as a more reliable OCR alternative
import OpenAI from 'openai'
import { mockExtractWineData } from './mock-vision'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Development mode flag - set to 'true' to avoid API costs during testing
const USE_MOCK_VISION = process.env.USE_MOCK_VISION === 'true'

export interface ParsedLabel {
  producer: string | null
  wine_name: string | null
  vintage: number | null
  alcohol_percent: number | null
  confidence: {
    producer: number
    wine_name: number
    vintage: number
    alcohol_percent: number
  }
  raw_text: string
}

export interface ParsingHint {
  vintage?: number
  producer?: string
  wine_name?: string
}

/**
 * Common wine producer aliases and normalizations
 */
const PRODUCER_ALIASES: Record<string, string> = {
  'dom.': 'domaine',
  'dom': 'domaine',
  'ch.': 'chateau',
  'ch': 'chateau',
  'cht.': 'chateau',
  'cht': 'chateau',
  'chât.': 'château',
  'chât': 'château',
  'cav.': 'cave',
  'cav': 'cave',
  'bod.': 'bodega',
  'bod': 'bodega',
  'cant.': 'cantina',
  'cant': 'cantina',
  'ten.': 'tenuta',
  'ten': 'tenuta',
  'az.': 'azienda',
  'az': 'azienda',
  'agr.': 'agricola',
  'agr': 'agricola'
}

/**
 * Extract structured wine data directly from image using OpenAI Vision
 * Much more reliable than OCR → parsing pipeline
 */
export async function extractWineDataFromImage(
  imageBuffer: Buffer | ArrayBuffer,
  hint?: ParsingHint
): Promise<ParsedLabel> {
  // Development mode - use mock data to avoid API costs
  if (USE_MOCK_VISION) {
    console.log('[Vision] 🚧 DEV MODE - Using mock data (set USE_MOCK_VISION=false for real API)')
    return mockExtractWineData(hint)
  }

  try {
    const buffer = Buffer.isBuffer(imageBuffer) 
      ? imageBuffer 
      : Buffer.from(imageBuffer)

    // Convert to base64
    const base64Image = buffer.toString('base64')
    const mimeType = detectMimeType(buffer)

    console.log('[Vision] ✨ Using OpenAI Vision API (costs ~$0.001 per image)')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a wine label recognition expert. Extract structured information from wine label images. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this wine label image and extract the following information as JSON:

{
  "producer": "The winery/producer name (e.g., 'Campo Viejo', 'Antinori', 'Chateau Margaux')",
  "wine_name": "The wine name or designation (e.g., 'RIOJA Tempranillo', 'Reserva', 'Grand Cru')",
  "vintage": 2019 (4-digit year, or null if not visible),
  "alcohol_percent": 13.5 (number between 5-20, or null if not visible),
  "raw_text": "All text visible on the label"
}

Important:
- producer is the BRAND/WINERY name (usually prominent)
- wine_name is the SPECIFIC WINE designation (may include appellation, grape variety, or cuvée name)
- Separate them clearly - don't put everything in producer
- Return null for fields you cannot confidently identify
- For vintage, only extract 4-digit years between 1900-${new Date().getFullYear() + 1}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.1
    })

    const responseText = response.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from Vision API')
    }

    console.log('[Vision] Raw response:', responseText)

    const extracted = JSON.parse(responseText)

    // Build ParsedLabel with extracted data
    const result: ParsedLabel = {
      producer: extracted.producer || hint?.producer || null,
      wine_name: extracted.wine_name || hint?.wine_name || null,
      vintage: extracted.vintage || hint?.vintage || null,
      alcohol_percent: extracted.alcohol_percent || null,
      confidence: {
        producer: extracted.producer ? 0.9 : (hint?.producer ? 0.5 : 0),
        wine_name: extracted.wine_name ? 0.9 : (hint?.wine_name ? 0.5 : 0),
        vintage: extracted.vintage ? 0.9 : (hint?.vintage ? 0.5 : 0),
        alcohol_percent: extracted.alcohol_percent ? 0.9 : 0
      },
      raw_text: extracted.raw_text || ''
    }

    console.log('[Vision] Extracted wine data:', result)
    
    return result
  } catch (error) {
    console.error('Vision extraction error:', error)
    throw new Error('Failed to extract wine data from image')
  }
}

/**
 * Legacy OCR function - kept for compatibility
 * Now just calls extractWineDataFromImage and returns raw_text
 */
export async function runOCR(imageBuffer: Buffer | ArrayBuffer): Promise<string> {
  const extracted = await extractWineDataFromImage(imageBuffer)
  return extracted.raw_text
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  const signatures: { [key: string]: number[] } = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46]
  }

  for (const [mime, sig] of Object.entries(signatures)) {
    if (sig.every((byte, i) => buffer[i] === byte)) {
      return mime
    }
  }

  return 'image/jpeg' // Default fallback
}

/**
 * Parse wine label entities from OCR text
 */
export function parseWineLabel(text: string, hint?: ParsingHint): ParsedLabel {
  const normalized = normalizeText(text)
  const lines = normalized.split('\n').filter(line => line.trim().length > 0)

  console.log('[Parser] OCR lines:', lines)

  // Extract vintage (4-digit year between 1900 and current year + 1)
  const { vintage, confidence: vintageConf } = extractVintage(text, hint?.vintage)

  // Extract alcohol percentage
  const { alcohol, confidence: alcoholConf } = extractAlcohol(text)

  // Extract producer and wine name using heuristics
  const { producer, wine_name, producerConf, wineNameConf } = extractProducerAndWine(
    lines,
    text,
    hint
  )

  return {
    producer,
    wine_name,
    vintage,
    alcohol_percent: alcohol,
    confidence: {
      producer: producerConf,
      wine_name: wineNameConf,
      vintage: vintageConf,
      alcohol_percent: alcoholConf
    },
    raw_text: text
  }
}

/**
 * Normalize text: remove diacritics, standardize case, unify punctuation
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['']/g, "'")            // Standardize apostrophes
    .replace(/[""]/g, '"')            // Standardize quotes
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim()
}

/**
 * Extract vintage year from text
 */
function extractVintage(text: string, hint?: number): { vintage: number | null; confidence: number } {
  const currentYear = new Date().getFullYear()
  const yearPattern = /\b(19\d{2}|20\d{2})\b/g
  const matches = text.match(yearPattern)

  if (!matches || matches.length === 0) {
    return { vintage: hint || null, confidence: hint ? 0.5 : 0 }
  }

  // Filter valid wine vintages (1900 to current year + 1)
  const validYears = matches
    .map(y => parseInt(y))
    .filter(y => y >= 1900 && y <= currentYear + 1)

  if (validYears.length === 0) {
    return { vintage: hint || null, confidence: hint ? 0.5 : 0 }
  }

  // If hint provided and matches, high confidence
  if (hint && validYears.includes(hint)) {
    return { vintage: hint, confidence: 0.95 }
  }

  // Most likely vintage is closest to current year (but not future)
  const sortedYears = validYears.sort((a, b) => 
    Math.abs(currentYear - a) - Math.abs(currentYear - b)
  )

  return {
    vintage: sortedYears[0],
    confidence: validYears.length === 1 ? 0.9 : 0.7
  }
}

/**
 * Extract alcohol percentage from text
 */
function extractAlcohol(text: string): { alcohol: number | null; confidence: number } {
  // Patterns: "13% vol", "13.5% alc/vol", "14% alcohol by volume", etc.
  const alcoholPatterns = [
    /(\d+\.?\d*)\s*%\s*(vol|alc|alcohol)/i,
    /(\d+\.?\d*)\s*% alc\.?\s*\/?\s*vol/i,
    /alcohol\s*:?\s*(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*%\s*by\s*volume/i
  ]

  for (const pattern of alcoholPatterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      // Valid wine alcohol range: 5% to 20%
      if (value >= 5 && value <= 20) {
        return { alcohol: value, confidence: 0.9 }
      }
    }
  }

  return { alcohol: null, confidence: 0 }
}

/**
 * Extract producer and wine name using improved heuristics
 */
function extractProducerAndWine(
  lines: string[],
  fullText: string,
  hint?: ParsingHint
): {
  producer: string | null
  wine_name: string | null
  producerConf: number
  wineNameConf: number
} {
  const producerKeywords = [
    'domaine', 'château', 'chateau', 'bodega', 'cantina', 'tenuta',
    'azienda', 'agricola', 'estate', 'winery', 'vineyard', 'vini',
    'wines', 'vignoble', 'cave', 'coop', 'cooperative'
  ]

  const appellationKeywords = [
    'doc', 'docg', 'doq', 'doca', 'aoc', 'aop', 'igp', 'igt',
    'vdp', 'vdt', 'vino', 'wine', 'vin', 'vinho', 'wein',
    'reserva', 'riserva', 'reserve', 'gran', 'grande', 'rioja',
    'chianti', 'barolo', 'burgundy', 'bordeaux', 'cava'
  ]

  const grapeKeywords = [
    'tempranillo', 'cabernet', 'merlot', 'pinot', 'chardonnay',
    'sauvignon', 'syrah', 'malbec', 'sangiovese', 'nebbiolo'
  ]

  let producer: string | null = null
  let wine_name: string | null = null
  let producerConf = 0
  let wineNameConf = 0

  // If hints provided, use them with medium confidence
  if (hint?.producer) {
    producer = hint.producer
    producerConf = 0.6
  }
  if (hint?.wine_name) {
    wine_name = hint.wine_name
    wineNameConf = 0.6
  }

  // IMPROVED: Try to find producer in first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].toLowerCase()
    
    // Check for producer keywords
    if (producerKeywords.some(kw => line.includes(kw))) {
      const candidateProducer = expandProducerAliases(lines[i])
      if (candidateProducer.length > 3 && candidateProducer.length < 100) {
        if (!producer || producerConf < 0.85) {
          producer = candidateProducer
          producerConf = 0.85
        }
      }
    }
  }

  // Strategy 1: Use FIRST line as producer
  // Remaining lines (with appellations/grapes) as wine name
  if (!producer && lines.length > 0) {
    const firstLine = lines[0]
    const lowerFirst = firstLine.toLowerCase()
    
    // If first line doesn't contain appellation/grape keywords, it's likely the producer
    if (!appellationKeywords.some(kw => lowerFirst.includes(kw)) &&
        !grapeKeywords.some(kw => lowerFirst.includes(kw))) {
      producer = expandProducerAliases(firstLine)
      producerConf = 0.8
      console.log('[Parser] Using first line as producer:', producer)
    }
  }

  // Strategy 2: Build wine name from remaining lines with keywords
  if (producer && !wine_name && lines.length > 1) {
    const remainingLines = lines.slice(1)
    const wineParts: string[] = []
    
    for (const line of remainingLines) {
      const lower = line.toLowerCase()
      
      // Include lines with appellation or grape keywords
      if (appellationKeywords.some(kw => lower.includes(kw)) || 
          grapeKeywords.some(kw => lower.includes(kw))) {
        wineParts.push(line)
      }
    }
    
    if (wineParts.length > 0) {
      wine_name = wineParts.join(' ')
      wineNameConf = 0.85
      console.log('[Parser] Built wine name from lines:', wine_name)
    }
  }

  // Fallback: If still no wine name, check if first line needs splitting
  if (producer && !wine_name) {
    const lowerProducer = producer.toLowerCase()
    
    // Check if producer line contains appellation or grape keywords
    for (const keyword of [...appellationKeywords, ...grapeKeywords]) {
      const idx = lowerProducer.indexOf(keyword)
      if (idx > 5) { // At least 5 chars before keyword
        const actualProducer = producer.substring(0, idx).trim()
        const candidateWine = producer.substring(idx).trim()
        
        if (actualProducer.length > 3 && candidateWine.length > 2) {
          producer = actualProducer
          wine_name = candidateWine
          wineNameConf = 0.75
          console.log('[Parser] Split single line:', { producer, wine_name })
          break
        }
      }
    }
  }

  // Last resort: If still no wine name but we have 2+ lines, use second line
  if (producer && !wine_name && lines.length >= 2) {
    wine_name = lines[1]
    wineNameConf = 0.5
    console.log('[Parser] Using second line as wine name:', wine_name)
  }

  console.log('[Parser] Final extraction:', { producer, producerConf, wine_name, wineNameConf })

  return {
    producer,
    wine_name,
    producerConf,
    wineNameConf
  }
}

/**
 * Expand producer aliases to full forms
 */
function expandProducerAliases(text: string): string {
  let expanded = text

  // Replace aliases with full forms
  Object.entries(PRODUCER_ALIASES).forEach(([alias, full]) => {
    const regex = new RegExp(`\\b${alias}\\b`, 'gi')
    expanded = expanded.replace(regex, full)
  })

  return expanded
}

/**
 * Calculate overall parsing confidence score
 */
export function getOverallConfidence(parsed: ParsedLabel): number {
  const weights = {
    producer: 0.35,
    wine_name: 0.35,
    vintage: 0.20,
    alcohol_percent: 0.10
  }

  return (
    parsed.confidence.producer * weights.producer +
    parsed.confidence.wine_name * weights.wine_name +
    parsed.confidence.vintage * weights.vintage +
    parsed.confidence.alcohol_percent * weights.alcohol_percent
  )
}

/**
 * Validate parsed results
 */
export function validateParsedLabel(parsed: ParsedLabel): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!parsed.producer || parsed.producer.trim().length < 2) {
    issues.push('Producer name is missing or too short')
  }

  if (!parsed.wine_name || parsed.wine_name.trim().length < 2) {
    issues.push('Wine name is missing or too short')
  }

  if (parsed.vintage) {
    const currentYear = new Date().getFullYear()
    if (parsed.vintage < 1900 || parsed.vintage > currentYear + 1) {
      issues.push('Vintage year appears invalid')
    }
  }

  if (parsed.alcohol_percent) {
    if (parsed.alcohol_percent < 5 || parsed.alcohol_percent > 20) {
      issues.push('Alcohol percentage appears invalid')
    }
  }

  const overallConf = getOverallConfidence(parsed)
  if (overallConf < 0.5) {
    issues.push('Overall confidence too low - manual entry recommended')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

