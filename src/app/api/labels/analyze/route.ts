import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runImageQC, QC_ERROR_MESSAGE } from '@/lib/labels/image-qc'
import { extractWineDataFromImage, validateParsedLabel } from '@/lib/labels/ocr-parser'
import { matchWines } from '@/lib/labels/fuzzy-match'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Schema for AI-generated wine data (same as ai-search endpoint)
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
  drink_starting: z.string().nullable(),
  drink_by: z.string().nullable()
})

/**
 * POST /api/labels/analyze
 * Analyzes a label image: QC check, OCR, parsing, and fuzzy matching
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
    const { imageKey, hint } = body

    if (!imageKey) {
      return NextResponse.json(
        { error: 'imageKey is required' },
        { status: 400 }
      )
    }

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('label_jobs')
      .insert({
        user_id: user.id,
        image_key: imageKey,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('job_id')
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
    }

    const jobId = jobData?.job_id

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('label-images')
      .download(imageKey)

    if (downloadError || !imageData) {
      console.error('Error downloading image:', downloadError)
      
      // Update job status
      if (jobId) {
        await supabase
          .from('label_jobs')
          .update({
            status: 'failed',
            error: 'Failed to download image',
            completed_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
      }

      return NextResponse.json(
        { error: 'Failed to retrieve image' },
        { status: 500 }
      )
    }

    // Convert blob to buffer
    const arrayBuffer = await imageData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Step 1: Quality Check
    const qcResult = await runImageQC(buffer)
    
    console.log('[ANALYZE] QC Result:', qcResult)

    // TEMPORARILY DISABLED for testing - uncomment to re-enable QC
    /*
    if (!qcResult.pass) {
      // Update job with QC failure
      if (jobId) {
        await supabase
          .from('label_jobs')
          .update({
            status: 'rejected_qc',
            qc: qcResult,
            completed_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
      }

      return NextResponse.json(
        {
          error: QC_ERROR_MESSAGE,
          qc: qcResult,
          type: 'qc_failed'
        },
        { status: 400 }
      )
    }
    */

    // Step 2 & 3: Extract structured wine data directly from image
    console.log('[ANALYZE] Extracting wine data with Vision AI...')
    const parsed = await extractWineDataFromImage(buffer, hint)
    console.log('[ANALYZE] Extracted result:', parsed)

    // Validate parsing results
    const validation = validateParsedLabel(parsed)

    if (!validation.valid && validation.issues.length > 0) {
      console.warn('Parsing validation issues:', validation.issues)
    }

    // Step 4: Match wines from database
    const matchResult = await matchWines({
      producer: parsed.producer,
      wine_name: parsed.wine_name,
      vintage: parsed.vintage,
      alcohol_percent: parsed.alcohol_percent
    })

    // Update job with success
    if (jobId) {
      await supabase
        .from('label_jobs')
        .update({
          status: 'succeeded',
          qc: qcResult,
          result: {
            parsed,
            validation,
            candidates: matchResult.candidates.map(c => ({
              wine_id: c.wine_id,
              score: c.score,
              confidence: c.confidence
            }))
          },
          model_version: 'v1.0',
          completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
    }

    // Auto-trigger AI search if we have high-confidence label extraction (80%+)
    const parsedConfidence = (parsed.confidence.producer + parsed.confidence.wine_name) / 2
    const shouldAutoTrigger = parsedConfidence >= 0.80
    
    if (shouldAutoTrigger) {
      console.log(`[ANALYZE] 🎯 High-confidence label extraction (${Math.round(parsedConfidence * 100)}%) - auto-triggering AI search`)
      console.log(`[ANALYZE] Producer confidence: ${Math.round(parsed.confidence.producer * 100)}%, Wine name confidence: ${Math.round(parsed.confidence.wine_name * 100)}%`)
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error('[ANALYZE] ⚠️  OpenAI API key not configured - skipping auto AI search')
      } else {
        try {
          const searchQuery = `${parsed.producer} ${parsed.wine_name}${parsed.vintage ? ` ${parsed.vintage}` : ''}`
          const traceId = `ai-search-auto-${Date.now()}-${user.id.substring(0, 8)}`
          
          console.log(`[ANALYZE] 🔍 Searching for: "${searchQuery}"`)
          
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
          if (responseText) {
            const wineData = WineDataSchema.parse(JSON.parse(responseText))
            
            console.log('[ANALYZE] ✅ AI search auto-completed:', {
              traceId,
              hasRatings: !!wineData.ratings,
              hasPrice: !!wineData.typical_price,
              color: wineData.color
            })
            
            return NextResponse.json({
              type: 'ai_result',
              parsed,
              wineData,
              traceId,
              source: 'openai_auto',
              jobId
            })
          } else {
            console.error('[ANALYZE] ⚠️  OpenAI returned no content')
          }
        } catch (aiError: any) {
          console.error('[ANALYZE] ❌ AI search auto-trigger failed:', aiError.message || aiError)
          console.error('[ANALYZE] Error details:', aiError)
          // Fall back to showing candidates on AI error
        }
      }
    } else {
      console.log(`[ANALYZE] No high-confidence label extraction (parsed confidence: ${Math.round(parsedConfidence * 100)}%)`)
    }
    
    // Return results based on matching outcome
    if (matchResult.candidates.length > 0) {
      return NextResponse.json({
        type: 'candidates',
        parsed,
        validation,
        candidates: matchResult.candidates,
        hasHighConfidence: matchResult.hasHighConfidence,
        jobId
      })
    } else {
      return NextResponse.json({
        type: 'no_match',
        parsed,
        validation,
        allowAiSearch: matchResult.allowAiSearch,
        jobId
      })
    }
  } catch (error: any) {
    console.error('Analyze error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to analyze label',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

