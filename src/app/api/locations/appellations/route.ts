import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('region_id');

    if (!regionId) {
      return NextResponse.json({ error: 'region_id parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('appellation')
      .select('appellation_id, appellation, classification')
      .eq('region_id', regionId)
      .not('appellation', 'is', null)
      .order('appellation');

    if (error) {
      console.error('Error fetching appellations:', error);
      return NextResponse.json({ error: 'Failed to fetch appellations' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in appellations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
