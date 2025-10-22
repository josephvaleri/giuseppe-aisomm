import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recomputeBadges } from '@/lib/badges/events'

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
      cellarQuantity = 0,
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

    // Check if this is a high-confidence AI search result that can bypass moderation
    // For AI search results, we consider them high-confidence if they came from auto-trigger (≥80% label extraction)
    const isHighConfidenceAI = source === 'ai_search' && selection.wineData && selection.confidence >= 0.80
    
    if (isHighConfidenceAI) {
      console.log('[COMMIT] High-confidence AI result detected - bypassing moderation')
      
      // Look up foreign key IDs (same logic as moderation accept)
      let countryId = null
      let regionId = null
      let appellationId = null

      if (selection.wineData.country) {
        const { data: countryData } = await supabase
          .from('countries_regions')
          .select('country_id')
          .ilike('country_name', selection.wineData.country)
          .limit(1)
          .maybeSingle()
        countryId = countryData?.country_id || null
      }

      if (selection.wineData.wine_region) {
        const { data: regionData } = await supabase
          .from('countries_regions')
          .select('region_id')
          .ilike('wine_region', selection.wineData.wine_region)
          .limit(1)
          .maybeSingle()
        regionId = regionData?.region_id || null
      }

      if (selection.wineData.appellation) {
        const { data: appellationData } = await supabase
          .from('appellation')
          .select('appellation_id')
          .ilike('appellation', selection.wineData.appellation)
          .limit(1)
          .maybeSingle()
        appellationId = appellationData?.appellation_id || null
      }

      // Format ratings as string (same as moderation accept)
      const formatRatingsString = (ratings: any) => {
        if (!ratings || typeof ratings !== 'object') return null
        return Object.entries(ratings)
          .map(([pub, score]) => `${pub}: ${score}`)
          .join(', ')
      }

      const ratingsString = formatRatingsString(selection.wineData.ratings)

      // Add wine directly to wines table using correct structure
      const { data: wineData, error: wineError } = await supabase
        .from('wines')
        .insert({
          producer: selection.wineData.producer,
          wine_name: selection.wineData.wine_name,
          vintage: selection.wineData.vintage,
          alcohol: selection.wineData.alcohol_percent,
          typical_price: selection.wineData.typical_price,
          bottle_size: selection.wineData.bottle_size,
          color: selection.wineData.color,
          ratings: ratingsString,
          flavor_profile: selection.wineData.flavor_profile,
          country_id: countryId,
          region_id: regionId,
          appellation_id: appellationId,
          drink_starting: selection.wineData.drink_starting,
          drink_by: selection.wineData.drink_by,
          my_score: null
        })
        .select('wine_id')
        .single()

      if (wineError) {
        console.error('Error inserting wine:', wineError)
        return NextResponse.json(
          { error: 'Failed to add wine to database' },
          { status: 500 }
        )
      }

      // If user wants to save to cellar, add to cellar_items
      if (saveToCellar && cellarQuantity > 0) {
        const { error: cellarError } = await supabase
          .from('cellar_items')
          .insert({
            user_id: user.id,
            wine_id: wineData.wine_id,
            quantity: cellarQuantity,
            status: 'stored'
          })

        if (cellarError) {
          console.error('Error adding to cellar:', cellarError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Recompute badges after wine addition
      try {
        await recomputeBadges(user.id);
      } catch (badgeError) {
        console.error('Badge recomputation error:', badgeError);
        // Don't fail the request if badge recomputation fails
      }

      return NextResponse.json({
        success: true,
        wineId: wineData.wine_id,
        redirectUrl: `/wines/${wineData.wine_id}`,
        message: `Wine added successfully${saveToCellar && cellarQuantity > 0 ? ` and ${cellarQuantity} bottle(s) added to your cellar` : ''}.`
      })
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
        cellar_quantity: cellarQuantity || 0,
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

    // Recompute badges after label scan submission
    try {
      await recomputeBadges(user.id);
    } catch (badgeError) {
      console.error('Badge recomputation error:', badgeError);
      // Don't fail the request if badge recomputation fails
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

