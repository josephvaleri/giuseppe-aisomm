/**
 * Fuzzy matching utilities for wine label recognition
 * Implements 70% matching rule using trigram similarity
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface WineCandidate {
  wine_id: number
  wine_name: string
  producer: string
  vintage?: number
  appellation?: string
  country?: string
  wine_region?: string
  flavor_profile?: string
  alcohol?: number
  typical_price?: number
  score: number
  confidence: number
}

export interface MatchResult {
  candidates: WineCandidate[]
  hasHighConfidenceMatch: boolean
  allowAiSearch: boolean
}

const MATCH_THRESHOLD = parseFloat(process.env.MATCH_SCORE_MIN || '0.70')

/**
 * Match wines from database using fuzzy matching (70% rule)
 * Combines producer and wine_name similarity scores
 */
export async function matchWines(parsed: {
  producer: string | null
  wine_name: string | null
  vintage?: number | null
  alcohol_percent?: number | null
}): Promise<MatchResult> {
  if (!parsed.producer || !parsed.wine_name) {
    return {
      candidates: [],
      hasHighConfidenceMatch: false,
      allowAiSearch: true
    }
  }

  const supabase = createServiceClient()

  // Use fuzzy_score function from database (trigram similarity)
  const { data, error } = await supabase.rpc('match_wines_fuzzy', {
    p_producer: parsed.producer,
    p_wine_name: parsed.wine_name,
    p_vintage: parsed.vintage || null,
    p_threshold: MATCH_THRESHOLD,
    p_limit: 25
  })

  if (error) {
    console.error('Error matching wines:', error)
    
    // Fallback to manual SQL if RPC doesn't exist
    return await matchWinesFallback(parsed)
  }

  if (!data || data.length === 0) {
    return {
      candidates: [],
      hasHighConfidenceMatch: false,
      allowAiSearch: true
    }
  }

  const candidates: WineCandidate[] = data.map((row: any) => ({
    wine_id: row.wine_id,
    wine_name: row.wine_name,
    producer: row.producer,
    vintage: row.vintage,
    appellation: row.appellation,
    country: row.country,
    wine_region: row.wine_region,
    flavor_profile: row.flavor_profile,
    alcohol: row.alcohol,
    typical_price: row.typical_price,
    score: row.score,
    confidence: calculateConfidence(row.score, parsed.vintage === row.vintage)
  }))

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)

  const hasHighConfidenceMatch = candidates.length > 0 && candidates[0].confidence >= 0.85

  return {
    candidates,
    hasHighConfidenceMatch,
    allowAiSearch: candidates.length === 0
  }
}

/**
 * Fallback matching using direct SQL query
 * This will be used if the RPC function doesn't exist yet
 */
async function matchWinesFallback(parsed: {
  producer: string | null
  wine_name: string | null
  vintage?: number | null
}): Promise<MatchResult> {
  const supabase = createServiceClient()

  // Manual fuzzy matching using LIKE and similarity
  const { data, error } = await supabase
    .from('wines')
    .select(`
      wine_id,
      wine_name,
      producer,
      vintage,
      appellation_id,
      country_id,
      region_id,
      flavor_profile,
      alcohol,
      typical_price,
      appellation:appellation_id(appellation),
      countries_regions:region_id(country_name, wine_region)
    `)
    .or(`producer.ilike.%${parsed.producer}%,wine_name.ilike.%${parsed.wine_name}%`)
    .limit(50)

  if (error || !data) {
    console.error('Fallback match error:', error)
    return {
      candidates: [],
      hasHighConfidenceMatch: false,
      allowAiSearch: true
    }
  }

  // Calculate similarity scores client-side
  const candidates = data
    .map(wine => {
      const producerScore = stringSimilarity(
        parsed.producer?.toLowerCase() || '',
        wine.producer?.toLowerCase() || ''
      )
      const wineNameScore = stringSimilarity(
        parsed.wine_name?.toLowerCase() || '',
        wine.wine_name?.toLowerCase() || ''
      )
      
      const score = 0.5 * producerScore + 0.5 * wineNameScore
      const vintageMatch = parsed.vintage === wine.vintage

      return {
        wine_id: wine.wine_id,
        wine_name: wine.wine_name,
        producer: wine.producer,
        vintage: wine.vintage,
        appellation: (wine.appellation as any)?.appellation,
        country: (wine.countries_regions as any)?.country_name,
        wine_region: (wine.countries_regions as any)?.wine_region,
        flavor_profile: wine.flavor_profile,
        alcohol: wine.alcohol,
        typical_price: wine.typical_price,
        score,
        confidence: calculateConfidence(score, vintageMatch)
      }
    })
    .filter(c => c.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)

  return {
    candidates,
    hasHighConfidenceMatch: candidates.length > 0 && candidates[0].confidence >= 0.85,
    allowAiSearch: candidates.length === 0
  }
}

/**
 * Calculate confidence score from match score and vintage match
 */
function calculateConfidence(score: number, vintageMatch: boolean): number {
  // Base confidence from fuzzy score
  let confidence = score

  // Bonus for vintage match
  if (vintageMatch) {
    confidence = Math.min(1.0, confidence + 0.1)
  }

  return confidence
}

/**
 * Simple string similarity using Dice coefficient
 * Returns value between 0 and 1
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const bigrams1 = getBigrams(str1)
  const bigrams2 = getBigrams(str2)

  if (bigrams1.size === 0 || bigrams2.size === 0) return 0

  let intersection = 0
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++
    }
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size)
}

/**
 * Get bigrams (character pairs) from a string
 */
function getBigrams(str: string): Set<string> {
  const normalized = str.toLowerCase().replace(/\s+/g, '')
  const bigrams = new Set<string>()

  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.substring(i, i + 2))
  }

  return bigrams
}

/**
 * Normalize wine name/producer for comparison
 */
export function normalizeWineText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Create match_wines_fuzzy RPC function
 * This SQL should be run as a migration or via Supabase SQL editor
 */
export const MATCH_WINES_RPC_SQL = `
create or replace function public.match_wines_fuzzy(
  p_producer text,
  p_wine_name text,
  p_vintage int default null,
  p_threshold numeric default 0.70,
  p_limit int default 25
)
returns table (
  wine_id bigint,
  wine_name text,
  producer text,
  vintage int,
  appellation text,
  country text,
  wine_region text,
  flavor_profile text,
  alcohol numeric,
  typical_price numeric,
  score numeric
)
language plpgsql
as $$
begin
  return query
  with normalized as (
    select
      w.wine_id,
      w.wine_name,
      w.producer,
      w.vintage,
      w.flavor_profile,
      w.alcohol,
      w.typical_price,
      a.appellation,
      cr.country_name as country,
      cr.wine_region,
      (
        0.5 * public.fuzzy_score(w.producer, p_producer) +
        0.5 * public.fuzzy_score(w.wine_name, p_wine_name)
      ) as match_score
    from public.wines w
    left join public.appellation a on w.appellation_id = a.appellation_id
    left join public.countries_regions cr on w.region_id = cr.region_id
    where w.producer is not null 
      and w.wine_name is not null
  )
  select
    n.wine_id,
    n.wine_name,
    n.producer,
    n.vintage,
    n.appellation,
    n.country,
    n.wine_region,
    n.flavor_profile,
    n.alcohol,
    n.typical_price,
    n.match_score as score
  from normalized n
  where n.match_score >= p_threshold
  order by 
    case when n.vintage = p_vintage then 1 else 0 end desc,
    n.match_score desc
  limit p_limit;
end;
$$;
`

