import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const countryId = searchParams.get('country_id')

    let query = supabase
      .from('countries_regions')
      .select('country_id, country_name, region_id, wine_region')
      .order('country_name, wine_region')

    // If country_id is provided, filter by country
    if (countryId) {
      query = query.eq('country_id', countryId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching countries-regions:', error)
      return NextResponse.json({ error: 'Failed to fetch countries-regions' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Countries-regions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
