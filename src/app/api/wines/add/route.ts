import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recomputeBadges } from '@/lib/badges/events'

export async function POST(request: NextRequest) {
  try {
    const { wineData, cellarData } = await request.json()

    if (!wineData || !wineData.producer || !wineData.wine_name) {
      return NextResponse.json({ error: 'Producer and wine name are required' }, { status: 400 })
    }

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Extract the token from the authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // First, check if wine already exists
    const { data: existingWine, error: searchError } = await supabase
      .from('wines')
      .select('wine_id')
      .eq('producer', wineData.producer)
      .eq('wine_name', wineData.wine_name)
      .eq('vintage', wineData.vintage || null)
      .single()

    let wineId: number

    if (existingWine) {
      // Use existing wine
      wineId = existingWine.wine_id
    } else {
      // Create new wine
      const { data: newWine, error: wineError } = await supabase
        .from('wines')
        .insert([{
          producer: wineData.producer,
          wine_name: wineData.wine_name,
          vintage: wineData.vintage,
          color: wineData.color,
          bottle_size: wineData.bottle_size,
          alcohol: wineData.alcohol_percent?.toString() || null,
          typical_price: wineData.typical_price,
          ratings: wineData.ratings ? JSON.stringify(wineData.ratings) : null,
          bubbly: wineData.bubbly ? 'Yes' : 'No'
        }])
        .select('wine_id')
        .single()

      if (wineError) {
        console.error('Error creating wine:', wineError)
        return NextResponse.json({ error: `Failed to create wine: ${wineError.message}` }, { status: 500 })
      }

      wineId = newWine.wine_id
    }

    // Use the authenticated user's ID
    const userId = user.id

    // Add to cellar
    const { data: cellarItem, error: cellarError } = await supabase
      .from('cellar_items')
      .insert([{
        user_id: userId,
        wine_id: wineId,
        quantity: cellarData.quantity || 1,
        where_stored: cellarData.where_stored,
        drink_starting: cellarData.drink_starting,
        drink_by: cellarData.drink_by,
        currency: cellarData.currency || 'USD',
        my_notes: cellarData.my_notes,
        status: cellarData.status || 'stored'
      }])
      .select('bottle_id')
      .single()

    if (cellarError) {
      console.error('Error adding to cellar:', cellarError)
      return NextResponse.json({ error: `Failed to add wine to cellar: ${cellarError.message}` }, { status: 500 })
    }

    // Recompute badges after wine addition
    try {
      await recomputeBadges(userId);
    } catch (badgeError) {
      console.error('Badge recomputation error:', badgeError);
      // Don't fail the request if badge recomputation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Wine added to cellar successfully',
      wineId,
      bottleId: cellarItem.bottle_id
    })

  } catch (error) {
    console.error('Add wine error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
