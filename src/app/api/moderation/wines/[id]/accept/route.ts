import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Convert ratings object to comma-separated string format
 * Example: { "Wine Enthusiast": 88, "Wine Spectator": 92 } → "Wine Enthusiast: 88, Wine Spectator: 92"
 */
function formatRatingsString(ratings: Record<string, number> | null): string | null {
  if (!ratings || Object.keys(ratings).length === 0) return null
  
  return Object.entries(ratings)
    .map(([publication, score]) => `${publication}: ${score}`)
    .join(', ')
}

/**
 * POST /api/moderation/wines/:id/accept
 * Accepts a wine from moderation queue and adds it to the wines table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is moderator/admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['admin', 'moderator'].includes(roleData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - moderator access required' },
        { status: 403 }
      )
    }

    // Await params for Next.js 15
    const { id } = await params
    const modId = parseInt(id)
    if (isNaN(modId)) {
      return NextResponse.json(
        { error: 'Invalid moderation ID' },
        { status: 400 }
      )
    }

    // Get moderation item
    const { data: modItem, error: fetchError } = await supabase
      .from('moderation_items_wines')
      .select('*')
      .eq('mod_id', modId)
      .single()

    if (fetchError || !modItem) {
      return NextResponse.json(
        { error: 'Moderation item not found' },
        { status: 404 }
      )
    }

    if (modItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item already processed' },
        { status: 400 }
      )
    }

    // Get body with optional edits
    const body = await request.json().catch(() => ({}))
    const editedData = body.editedData || {}

    // Merge edited data with original
    const finalData = {
      producer: editedData.producer || modItem.producer,
      wine_name: editedData.wine_name || modItem.wine_name,
      vintage: editedData.vintage !== undefined ? editedData.vintage : modItem.vintage,
      alcohol_percent: editedData.alcohol_percent !== undefined ? editedData.alcohol_percent : modItem.alcohol_percent,
      typical_price: editedData.typical_price !== undefined ? editedData.typical_price : modItem.typical_price,
      bottle_size: editedData.bottle_size || modItem.bottle_size,
      color: editedData.color || modItem.color,
      flavor_profile: editedData.flavor_profile || modItem.flavor_profile,
      country: editedData.country || modItem.country,
      wine_region: editedData.wine_region || modItem.wine_region,
      appellation: editedData.appellation || modItem.appellation,
      drink_starting: editedData.drink_starting || modItem.drink_starting,
      drink_by: editedData.drink_by || modItem.drink_by,
      grapes: editedData.grapes || modItem.grapes || [],
      ratings: editedData.ratings || modItem.ratings || null
    }

    // Look up IDs for foreign keys (country, region, appellation)
    let countryId = null
    let regionId = null
    let appellationId = null

    // Look up country_id by matching country_name in countries_regions table
    if (finalData.country) {
      const { data: countryData } = await supabase
        .from('countries_regions')
        .select('country_id')
        .ilike('country_name', finalData.country)
        .limit(1)
        .maybeSingle()
      
      countryId = countryData?.country_id || null
      
      console.log(`[Accept] Country lookup: "${finalData.country}" → country_id: ${countryId}`)
    }

    // Look up region_id by matching wine_region in countries_regions table
    if (finalData.wine_region) {
      const { data: regionData } = await supabase
        .from('countries_regions')
        .select('region_id')
        .ilike('wine_region', finalData.wine_region)
        .limit(1)
        .maybeSingle()
      
      regionId = regionData?.region_id || null
      
      console.log(`[Accept] Region lookup: "${finalData.wine_region}" → region_id: ${regionId}`)
    }

    // Look up appellation_id
    if (finalData.appellation) {
      const { data: appellationData } = await supabase
        .from('appellation')
        .select('appellation_id')
        .ilike('appellation', finalData.appellation)
        .limit(1)
        .maybeSingle()
      
      appellationId = appellationData?.appellation_id || null
      
      console.log(`[Accept] Appellation lookup: "${finalData.appellation}" → appellation_id: ${appellationId}`)
    }

    // Format ratings for storage
    const ratingsString = formatRatingsString(finalData.ratings)
    if (ratingsString) {
      console.log(`[Accept] Ratings formatted: "${ratingsString}"`)
    }

    // Insert or update wine in wines table
    const { data: wine, error: wineError } = await supabase
      .from('wines')
      .upsert({
        producer: finalData.producer,
        wine_name: finalData.wine_name,
        vintage: finalData.vintage,
        alcohol: finalData.alcohol_percent,
        typical_price: finalData.typical_price,
        bottle_size: finalData.bottle_size,
        color: finalData.color,
        ratings: ratingsString,
        flavor_profile: finalData.flavor_profile,
        country_id: countryId,
        region_id: regionId,
        appellation_id: appellationId,
        drink_starting: finalData.drink_starting,
        drink_by: finalData.drink_by,
        my_score: null
      }, {
        onConflict: 'wine_id',
        ignoreDuplicates: false
      })
      .select('wine_id')
      .single()

    if (wineError) {
      console.error('Error inserting wine:', wineError)
      return NextResponse.json(
        { error: 'Failed to insert wine into database' },
        { status: 500 }
      )
    }

    // Move image from label-images to wine-images if exists
    if (modItem.image_key) {
      try {
        // Download from label-images
        const { data: imageData } = await supabase.storage
          .from('label-images')
          .download(modItem.image_key)

        if (imageData) {
          // Upload to wine-images with wine_id
          const newKey = `${wine.wine_id}/${Date.now()}.jpg`
          await supabase.storage
            .from('wine-images')
            .upload(newKey, imageData, {
              contentType: 'image/jpeg',
              upsert: false
            })

          // Delete from label-images
          await supabase.storage
            .from('label-images')
            .remove([modItem.image_key])
        }
      } catch (error) {
        console.error('Error moving image:', error)
        // Continue even if image move fails
      }
    }

    // Update moderation item status
    const { error: updateError } = await supabase
      .from('moderation_items_wines')
      .update({
        status: 'accepted',
        decided_at: new Date().toISOString(),
        decided_by: user.id
      })
      .eq('mod_id', modId)

    if (updateError) {
      console.error('Error updating moderation status:', updateError)
    }

    // If saveToMycellar flag was set, add to user's cellar
    // (Assuming there's a cellar join table - implement if needed)

    return NextResponse.json({
      success: true,
      wineId: wine.wine_id,
      message: 'Wine accepted and added to database'
    })
  } catch (error) {
    console.error('Accept error:', error)
    return NextResponse.json(
      { error: 'Failed to accept wine' },
      { status: 500 }
    )
  }
}

