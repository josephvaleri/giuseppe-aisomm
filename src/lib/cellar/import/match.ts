import { createClient } from '@/lib/supabase/server';
import { ParsedRow } from '@/lib/zod/cellar-import';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MatchResult = {
  status: 'EXACT_MATCH' | 'LIKELY_MATCH' | 'NO_MATCH';
  score?: number;
  wine_id?: number;
};

export async function findByUPC(upc: string): Promise<MatchResult> {
  if (!upc) return { status: 'NO_MATCH' };
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('wines')
    .select('wine_id')
    .eq('upc', upc)
    .single();
  
  if (error || !data) return { status: 'NO_MATCH' };
  
  return {
    status: 'EXACT_MATCH',
    wine_id: data.wine_id,
  };
}

export async function findLikelyMatch(row: ParsedRow): Promise<MatchResult> {
  const supabase = await createClient();
  
  // Build search terms
  const searchTerms: string[] = [];
  
  if (row.producer) searchTerms.push(row.producer);
  if (row.wine_name) searchTerms.push(row.wine_name);
  if (row.vintage) searchTerms.push(row.vintage.toString());
  
  if (searchTerms.length === 0) {
    return { status: 'NO_MATCH' };
  }
  
  const searchText = searchTerms.join(' ');
  
  // Use trigram similarity for matching
  const { data, error } = await supabase.rpc('search_wines_similarity', {
    search_text: searchText,
    similarity_threshold: 0.65
  });
  
  if (error || !data || data.length === 0) {
    return { status: 'NO_MATCH' };
  }
  
  const bestMatch = data[0];
  
  if (bestMatch.similarity >= 0.80) {
    return {
      status: 'EXACT_MATCH',
      score: bestMatch.similarity,
      wine_id: bestMatch.wine_id,
    };
  } else if (bestMatch.similarity >= 0.65) {
    return {
      status: 'LIKELY_MATCH',
      score: bestMatch.similarity,
      wine_id: bestMatch.wine_id,
    };
  }
  
  return { status: 'NO_MATCH' };
}

export async function createMinimalWine(row: ParsedRow, supabase?: SupabaseClient): Promise<number> {
  const client = supabase || await createClient();
  
  // Get country_id and region_id from existing data if possible
  let countryId: number | null = null;
  let regionId: number | null = null;
  
  // Try to find a similar wine to get location data
  if (row.producer || row.wine_name) {
    const searchTerms = [row.producer, row.wine_name].filter(Boolean).join(' ');
    const { data: similarWines } = await client.rpc('search_wines_similarity', {
      search_text: searchTerms,
      similarity_threshold: 0.3
    });
    
    if (similarWines && similarWines.length > 0) {
      const { data: wineData } = await client
        .from('wines')
        .select('country_id, region_id')
        .eq('wine_id', similarWines[0].wine_id)
        .single();
      
      if (wineData) {
        countryId = wineData.country_id;
        regionId = wineData.region_id;
      }
    }
  }
  
  // Create minimal wine
  const { data, error } = await client
    .from('wines')
    .insert({
      producer: row.producer || 'Unknown',
      wine_name: row.wine_name || 'Unknown Wine',
      vintage: row.vintage || null,
      color: row.color || null,
      alcohol: row.alcohol || null,
      bottle_size: row.bottle_size || null,
      country_id: countryId,
      region_id: regionId,
      appellation_id: null,
      typical_price: row.typical_price || null,
      ratings: row.ratings_blob || null,
      drink_starting: row.drink_from ? new Date(row.drink_from).toISOString() : null,
      drink_by: row.drink_to ? new Date(row.drink_to).toISOString() : null,
      my_score: null,
    })
    .select('wine_id')
    .single();
  
  if (error) {
    console.error('Error creating minimal wine:', error);
    throw new Error(`Failed to create wine: ${error.message}`);
  }
  
  return data.wine_id;
}

export async function matchWine(row: ParsedRow): Promise<MatchResult> {
  // First try UPC/barcode exact match
  if (row.upc) {
    const upcMatch = await findByUPC(row.upc);
    if (upcMatch.status === 'EXACT_MATCH') {
      return upcMatch;
    }
  }
  
  if (row.barcode) {
    const barcodeMatch = await findByUPC(row.barcode);
    if (barcodeMatch.status === 'EXACT_MATCH') {
      return barcodeMatch;
    }
  }
  
  // Then try similarity matching
  return await findLikelyMatch(row);
}
