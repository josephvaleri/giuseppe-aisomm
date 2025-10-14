import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Schema for AI-generated wine data
const WineDataSchema = z.object({
  producer: z.string(),
  wine_name: z.string(),
  vintage: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable(),
  alcohol_percent: z.number().min(5).max(20).nullable(),
  typical_price: z.number().min(0).nullable(),
  bottle_size: z.string().nullable(),
  color: z.string().nullable(),
  grapes: z.array(z.string()),
  ratings: z.record(z.string(), z.number()).nullable(),
  country: z.string().nullable(),
  wine_region: z.string().nullable(),
  appellation: z.string().nullable(),
  flavor_profile: z.string().nullable(),
  drink_starting: z.string().nullable(), // ISO date
  drink_by: z.string().nullable() // ISO date
})

/**
 * POST /api/labels/ai-search
 * Uses OpenAI to search for wine information when database match fails
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { parsed } = body

    if (!parsed || !parsed.producer || !parsed.wine_name) {
      return NextResponse.json(
        { error: 'Producer and wine name are required' },
        { status: 400 }
      )
    }

    const traceId = `ai-search-${Date.now()}-${user.id.substring(0, 8)}`

    // Build search query
    const searchQuery = `${parsed.producer} ${parsed.wine_name}${parsed.vintage ? ` ${parsed.vintage}` : ''}`

    // Call OpenAI with function calling for structured output
    const completion = await openai.chat.completions.create({
      model: process.env.AI_SEARCH_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a wine database assistant. When given a wine producer, name, and optional vintage, return accurate wine information in structured JSON format.

Important guidelines:
- Use authoritative sources when possible
- For prices, provide typical retail prices in USD if available
- For ratings, include well-known publications: Wine Enthusiast, Wine Spectator, Decanter, James Suckling
- Be conservative with ratings - only include if you have confident information
- For drink windows, provide reasonable estimates based on wine type and vintage
- Return null for fields where you're not confident
- Grapes should be the actual grape varieties, not just "red blend" or "white blend"`
        },
        {
          role: 'user',
          content: `Find information about this wine: ${searchQuery}

Return the data in this exact JSON structure:
{
  "producer": string,
  "wine_name": string,
  "vintage": number or null,
  "alcohol_percent": number (5-20) or null,
  "typical_price": number (USD) or null,
  "bottle_size": string (e.g., "750ml", "1.5L") or null,
  "color": string (e.g., "Red", "White", "Rosé", "Orange", "Sparkling White", "Sparkling Rosé") or null,
  "grapes": string[],
  "ratings": { "Publication": number } or null,
  "country": string or null,
  "wine_region": string or null,
  "appellation": string or null,
  "flavor_profile": string or null,
  "drink_starting": "YYYY-MM-DD" or null,
  "drink_by": "YYYY-MM-DD" or null
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse and validate response
    let wineData
    try {
      const parsed_json = JSON.parse(responseText)
      wineData = WineDataSchema.parse(parsed_json)
    } catch (error) {
      console.error('AI response validation error:', error)
      return NextResponse.json(
        { error: 'AI returned invalid data format' },
        { status: 500 }
      )
    }

    // Log the AI search for tracking
    console.log('AI Search completed:', {
      traceId,
      query: searchQuery,
      hasRatings: !!wineData.ratings,
      hasPrice: !!wineData.typical_price,
      grapeCount: wineData.grapes.length
    })

    return NextResponse.json({
      type: 'ai_result',
      wineData,
      traceId,
      source: 'openai'
    })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform AI search' },
      { status: 500 }
    )
  }
}

