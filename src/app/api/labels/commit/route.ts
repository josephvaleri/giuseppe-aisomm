import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/labels/commit
 * Commits a wine selection to the moderation queue
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
    const {
      selection,
      imageKey,
      source, // 'label_scan' | 'manual' | 'ai_search'
      saveToCellar = false,
      openaiTraceId
    } = body

    if (!selection || !source) {
      return NextResponse.json(
        { error: 'Selection and source are required' },
        { status: 400 }
      )
    }

    // Validate source
    if (!['label_scan', 'manual', 'ai_search'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source' },
        { status: 400 }
      )
    }

    // Insert into moderation queue
    const { data: modItem, error: insertError } = await supabase
      .from('moderation_items_wines')
      .insert({
        user_id: user.id,
        image_key: imageKey || null,
        source,
        producer: selection.producer || selection.wineData?.producer,
        wine_name: selection.wine_name || selection.wineData?.wine_name,
        vintage: selection.vintage || selection.wineData?.vintage,
        alcohol_percent: selection.alcohol_percent || selection.wineData?.alcohol_percent,
        typical_price: selection.typical_price || selection.wineData?.typical_price,
        bottle_size: selection.bottle_size || selection.wineData?.bottle_size,
        color: selection.color || selection.wineData?.color,
        grapes: selection.grapes || selection.wineData?.grapes || [],
        ratings: selection.ratings || selection.wineData?.ratings || null,
        country: selection.country || selection.wineData?.country,
        wine_region: selection.wine_region || selection.wineData?.wine_region,
        appellation: selection.appellation || selection.wineData?.appellation,
        flavor_profile: selection.flavor_profile || selection.wineData?.flavor_profile,
        drink_starting: selection.drink_starting || selection.wineData?.drink_starting,
        drink_by: selection.drink_by || selection.wineData?.drink_by,
        confidence: selection.confidence || {
          producer: selection.producerConf || 0.8,
          wine_name: selection.wineNameConf || 0.8,
          vintage: selection.vintageConf || 0.7,
          alcohol_percent: selection.alcoholConf || 0.6
        },
        candidate_ids: selection.wine_id ? [selection.wine_id] : [],
        candidate_json: selection.candidates || null,
        openai_trace_id: openaiTraceId || null,
        save_to_cellar: saveToCellar,
        status: 'pending'
      })
      .select('mod_id')
      .single()

    if (insertError) {
      console.error('Error inserting moderation item:', insertError)
      return NextResponse.json(
        { error: 'Failed to create moderation item' },
        { status: 500 }
      )
    }

    // Return redirect URL to wine detail page (pending state)
    return NextResponse.json({
      success: true,
      modId: modItem.mod_id,
      redirectUrl: `/wines/pending/${modItem.mod_id}`,
      message: 'Wine submitted for moderation. You will be notified when it is approved.'
    })
  } catch (error) {
    console.error('Commit error:', error)
    return NextResponse.json(
      { error: 'Failed to commit selection' },
      { status: 500 }
    )
  }
}

