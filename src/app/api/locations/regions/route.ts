import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get('country_id');

    if (!countryId) {
      return NextResponse.json({ error: 'country_id parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('countries_regions')
      .select('region_id, wine_region')
      .eq('country_id', countryId)
      .not('wine_region', 'is', null)
      .order('wine_region');

    if (error) {
      console.error('Error fetching regions:', error);
      return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in regions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
