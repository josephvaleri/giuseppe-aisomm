import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export type ParagraphRow = Record<string, unknown>

export interface ParagraphInput {
  question: string
  rows: ParagraphRow[]
  domain?: 'wine' | 'generic'
  maxWords?: number
}

/**
 * LLM-based paragraph formatter that converts structured data into natural prose
 */
export async function toParagraphLLM(input: ParagraphInput): Promise<string> {
  const { question, rows, domain = 'wine', maxWords = 180 } = input
  
  if (rows.length === 0) {
    return `I couldn't find any relevant information about "${question}". Please try asking about a specific wine region, grape variety, or appellation.`
  }

  const systemPrompt = `You are a wine expert writing concise, informative paragraphs. Convert the provided wine data into a single, flowing paragraph of natural prose. 

Requirements:
- Write ONE paragraph only (no line breaks, no bullet points, no numbered lists)
- Use only the facts provided in the data
- Keep it under ${maxWords} words
- Write in an informative, conversational tone
- Weave the information naturally together
- Focus on the most important and interesting details
- If multiple items are provided, mention the key ones but don't list them all

Example style: "Chianti, an appellation in Tuscany, Italy, is traditionally centered on Sangiovese with supporting varieties such as Canaiolo. Wines are typically dry and food-friendly, showing bright acidity with red-cherry fruit and herbal nuances..."`

  const userPrompt = `Question: "${question}"

Data to convert:
${JSON.stringify(rows, null, 2)}

Convert this data into a single, flowing paragraph of natural prose about wine.`

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GIUSEPPE_OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    })

    return completion.choices[0]?.message?.content?.trim() || toParagraphFallback(input)
  } catch (error) {
    console.error('LLM paragraph formatting failed, falling back to template:', error)
    return toParagraphFallback(input)
  }
}

/**
 * Fallback template-based paragraph formatter for when LLM is unavailable
 */
export function toParagraphFallback(input: ParagraphInput): string {
  const { question, rows, maxWords = 180 } = input
  
  if (rows.length === 0) {
    return `I couldn't find any relevant information about "${question}". Please try asking about a specific wine region, grape variety, or appellation.`
  }

  // Extract common wine fields from the first row or aggregate across rows
  const primaryRow = rows[0]
  const name = primaryRow.name || primaryRow.appellation || primaryRow.grape_variety || 'this wine'
  const country = primaryRow.country || primaryRow.country_name
  const region = primaryRow.region || primaryRow.wine_region
  const classification = primaryRow.classification || primaryRow.appellation_type
  
  // Handle grape varieties
  let grapes = []
  if (primaryRow.primary_grapes && Array.isArray(primaryRow.primary_grapes)) {
    grapes = primaryRow.primary_grapes
  } else if (primaryRow.grape_variety) {
    grapes = [primaryRow.grape_variety]
  } else if (primaryRow.major_grapes) {
    grapes = (primaryRow.major_grapes as string).split(',').map(g => g.trim())
  }
  
  // Handle styles
  let styles = []
  if (primaryRow.styles && Array.isArray(primaryRow.styles)) {
    styles = primaryRow.styles
  } else if (primaryRow.wine_color) {
    styles = [primaryRow.wine_color]
  }
  
  // Handle typical profile
  let profile = []
  if (primaryRow.typical_profile && Array.isArray(primaryRow.typical_profile)) {
    profile = primaryRow.typical_profile
  } else if (primaryRow.flavor) {
    profile = [(primaryRow.flavor as string)]
  }

  // Build the paragraph
  let paragraph = `${name}`
  
  if (country && region) {
    paragraph += `, an appellation in ${region}, ${country}`
  } else if (country) {
    paragraph += ` from ${country}`
  } else if (region) {
    paragraph += ` from the ${region} region`
  }
  
  if (classification) {
    paragraph += `, holds ${classification} classification`
  }
  
  if (grapes.length > 0) {
    const grapeText = grapes.length === 1 
      ? `centers on ${grapes[0]}`
      : `traditionally features ${grapes.slice(0, 3).join(', ')}${grapes.length > 3 ? ' and other varieties' : ''}`
    paragraph += ` and ${grapeText}`
  }
  
  if (styles.length > 0) {
    paragraph += `. The wines are typically ${styles.join(' and ')}`
  }
  
  if (profile.length > 0) {
    paragraph += `, showing ${profile.slice(0, 3).join(', ')}`
  }
  
  paragraph += '.'
  
  // Handle multiple rows (if applicable)
  if (rows.length > 1) {
    paragraph += ` Additional variations and styles exist within this category, reflecting the diversity of terroir and winemaking approaches.`
  }
  
  // Ensure we don't exceed word limit
  const words = paragraph.split(/\s+/)
  if (words.length > maxWords) {
    paragraph = words.slice(0, maxWords).join(' ') + '...'
  }
  
  return paragraph
}

/**
 * Main function that tries LLM first, then falls back to template
 */
export async function formatAsParagraph(input: ParagraphInput): Promise<string> {
  try {
    return await toParagraphLLM(input)
  } catch (error) {
    console.error('Error in formatAsParagraph, using fallback:', error)
    return toParagraphFallback(input)
  }
}

/**
 * Utility function to validate that output is a proper paragraph
 */
export function validateParagraph(text: string): boolean {
  // Check for bullet points or numbered lists
  const hasLists = /^\s*[-*0-9]+\./m.test(text)
  
  // Check that it's essentially one paragraph (no multiple blank lines)
  const paragraphCount = text.trim().split(/\n{2,}/).length
  
  return !hasLists && paragraphCount <= 1
}

