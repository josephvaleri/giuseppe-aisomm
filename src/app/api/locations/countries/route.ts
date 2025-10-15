import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('countries_regions')
      .select('country_id, country_name')
      .not('country_name', 'is', null)
      .order('country_name');

    if (error) {
      console.error('Error fetching countries:', error);
      return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
    }

    // Remove duplicates based on country_id
    const uniqueCountries = data.filter((country, index, self) => 
      index === self.findIndex(c => c.country_id === country.country_id)
    );

    return NextResponse.json(uniqueCountries);
  } catch (error) {
    console.error('Error in countries API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
