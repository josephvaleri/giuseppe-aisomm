import { createServiceClient } from '@/lib/supabase/server'

export interface EntityDictionaries {
  grapes: Set<string>
  appellations: Set<string>
  regions: Set<string>
  countries: Set<string>
  wines: Set<string>
  producers: Set<string>
  classifications: Set<string>
}

export interface QuestionFeatures {
  len_chars: number
  len_tokens: number
  has_year: boolean
  has_price: boolean
  has_alcohol_pct: boolean
  grape_count: number
  appellation_count: number
  region_count: number
  country_count: number
  wine_count: number
  producer_count: number
  classification_count: number
  intent_pairing: boolean
  intent_region: boolean
  intent_grape: boolean
  intent_cellar: boolean
  intent_recommendation: boolean
  intent_joke: boolean
  intent_non_wine: boolean
}

export interface RetrievalFeatures {
  retr_top1_score: number
  retr_topK_mean: number
  retr_gap_top1_top2: number
  overlap_jaccard: number
  overlap_lcs: number
  entity_overlap_count: number
  source_appellation: boolean
  source_grapes: boolean
  source_classification: boolean
  source_wines: boolean
  source_documents: boolean
  source_wine_region_documents: boolean
  acceptance_rate_global: number
  acceptance_rate_user: number
}

export interface RouteFeatures {
  can_answer_from_joins: boolean
  retr_confidence: number
  intent_is_joke: boolean
  intent_is_non_wine: boolean
  db_join_success: boolean
  chunk_quality_score: number
}

export async function loadEntityDictionaries(): Promise<EntityDictionaries> {
  const supabase = createServiceClient()
  
  const [grapesResult, appellationsResult, regionsResult, winesResult, classificationsResult] = await Promise.all([
    supabase.from('grapes').select('grape_variety'),
    supabase.from('appellation').select('appellation'),
    supabase.from('countries_regions').select('wine_region, country_name'),
    supabase.from('wines').select('wine_name, producer'),
    supabase.from('world_wine_classification_systems').select('classification_system')
  ])

  const grapes = new Set(grapesResult.data?.map(g => g.grape_variety.toLowerCase()) || [])
  const appellations = new Set(appellationsResult.data?.map(a => a.appellation.toLowerCase()) || [])
  const regions = new Set(regionsResult.data?.map(r => r.wine_region.toLowerCase()) || [])
  const countries = new Set(regionsResult.data?.map(r => r.country_name.toLowerCase()) || [])
  const wines = new Set(winesResult.data?.map(w => w.wine_name.toLowerCase()) || [])
  const producers = new Set(winesResult.data?.map(w => w.producer.toLowerCase()) || [])
  const classifications = new Set(classificationsResult.data?.map(c => c.classification_system.toLowerCase()) || [])

  return {
    grapes,
    appellations,
    regions,
    countries,
    wines,
    producers,
    classifications
  }
}

export function extractQuestionFeatures(question: string, dicts: EntityDictionaries): QuestionFeatures {
  const lowerQuestion = question.toLowerCase()
  
  // Basic features
  const len_chars = question.length
  const len_tokens = question.split(/\s+/).length
  const has_year = /\b(19|20)\d{2}\b/.test(question)
  const has_price = /\$|\d+\s*(dollars?|euros?|cents?)/i.test(question)
  const has_alcohol_pct = /\d+\.?\d*\s*%/i.test(question)
  
  // Entity counts
  const grape_count = Array.from(dicts.grapes).filter(grape => lowerQuestion.includes(grape)).length
  const appellation_count = Array.from(dicts.appellations).filter(app => lowerQuestion.includes(app)).length
  const region_count = Array.from(dicts.regions).filter(region => lowerQuestion.includes(region)).length
  const country_count = Array.from(dicts.countries).filter(country => lowerQuestion.includes(country)).length
  const wine_count = Array.from(dicts.wines).filter(wine => lowerQuestion.includes(wine)).length
  const producer_count = Array.from(dicts.producers).filter(producer => lowerQuestion.includes(producer)).length
  const classification_count = Array.from(dicts.classifications).filter(classification => lowerQuestion.includes(classification)).length
  
  // Intent flags
  const intent_pairing = /\b(pair|match|go with|accompany|food|dinner|lunch|meal)\b/i.test(question)
  const intent_region = /\b(region|area|place|where|location|terroir)\b/i.test(question)
  const intent_grape = /\b(grape|variety|varietal|blend)\b/i.test(question)
  const intent_cellar = /\b(cellar|age|aging|store|storage|collect|collection)\b/i.test(question)
  const intent_recommendation = /\b(recommend|suggest|best|good|favorite|like|prefer)\b/i.test(question)
  const intent_joke = /\b(joke|funny|humor|laugh)\b/i.test(question)
  const intent_non_wine = /\b(beer|spirits|liquor|cocktail|whiskey|vodka|gin|rum|tequila)\b/i.test(question)
  
  return {
    len_chars,
    len_tokens,
    has_year,
    has_price,
    has_alcohol_pct,
    grape_count,
    appellation_count,
    region_count,
    country_count,
    wine_count,
    producer_count,
    classification_count,
    intent_pairing,
    intent_region,
    intent_grape,
    intent_cellar,
    intent_recommendation,
    intent_joke,
    intent_non_wine
  }
}

export function extractRetrievalFeatures(
  question: string,
  candidates: Array<{ chunk: string; score: number; doc_id?: string }>,
  dicts: EntityDictionaries
): RetrievalFeatures {
  if (candidates.length === 0) {
    return {
      retr_top1_score: 0,
      retr_topK_mean: 0,
      retr_gap_top1_top2: 0,
      overlap_jaccard: 0,
      overlap_lcs: 0,
      entity_overlap_count: 0,
      source_appellation: false,
      source_grapes: false,
      source_classification: false,
      source_wines: false,
      source_documents: false,
      source_wine_region_documents: false,
      acceptance_rate_global: 0,
      acceptance_rate_user: 0
    }
  }

  const top1 = candidates[0]
  const topK_mean = candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length
  const gap_top1_top2 = candidates.length > 1 ? top1.score - candidates[1].score : 0

  // Overlap metrics
  const questionWords = new Set(question.toLowerCase().split(/\s+/))
  const topChunkWords = new Set(top1.chunk.toLowerCase().split(/\s+/))
  const intersection = new Set([...questionWords].filter(x => topChunkWords.has(x)))
  const union = new Set([...questionWords, ...topChunkWords])
  const overlap_jaccard = intersection.size / union.size

  // LCS approximation (simplified)
  const overlap_lcs = intersection.size / Math.max(questionWords.size, topChunkWords.size)

  // Entity overlap
  const entity_overlap_count = Array.from(dicts.grapes).filter(grape => 
    top1.chunk.toLowerCase().includes(grape)
  ).length + Array.from(dicts.appellations).filter(app => 
    top1.chunk.toLowerCase().includes(app)
  ).length

  // Source hints (simplified - would need actual doc metadata)
  const source_appellation = top1.chunk.toLowerCase().includes('appellation') || 
                            top1.chunk.toLowerCase().includes('classification')
  const source_grapes = top1.chunk.toLowerCase().includes('grape') || 
                       top1.chunk.toLowerCase().includes('variety')
  const source_classification = top1.chunk.toLowerCase().includes('classification')
  const source_wines = top1.chunk.toLowerCase().includes('wine') || 
                      top1.chunk.toLowerCase().includes('producer')
  const source_documents = !source_appellation && !source_grapes && !source_classification && !source_wines
  const source_wine_region_documents = top1.chunk.toLowerCase().includes('region')

  return {
    retr_top1_score: top1.score,
    retr_topK_mean: topK_mean,
    retr_gap_top1_top2: gap_top1_top2,
    overlap_jaccard,
    overlap_lcs,
    entity_overlap_count,
    source_appellation,
    source_grapes,
    source_classification,
    source_wines,
    source_documents,
    source_wine_region_documents,
    acceptance_rate_global: 0.7, // Placeholder - would calculate from historical data
    acceptance_rate_user: 0.7 // Placeholder - would calculate from user history
  }
}

export function extractRouteFeatures(
  questionFeatures: QuestionFeatures,
  retrievalFeatures: RetrievalFeatures,
  dbJoinSuccess: boolean
): RouteFeatures {
  return {
    can_answer_from_joins: dbJoinSuccess,
    retr_confidence: retrievalFeatures.retr_top1_score,
    intent_is_joke: questionFeatures.intent_joke,
    intent_is_non_wine: questionFeatures.intent_non_wine,
    db_join_success: dbJoinSuccess,
    chunk_quality_score: retrievalFeatures.overlap_jaccard
  }
}

export function featuresToVector(features: QuestionFeatures | RetrievalFeatures | RouteFeatures): number[] {
  return Object.values(features).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v)
}

export function normalizeFeatures(features: number[], schema: any): number[] {
  // Simple min-max normalization
  return features.map((f, i) => {
    const min = schema.min?.[i] || 0
    const max = schema.max?.[i] || 1
    return (f - min) / (max - min)
  })
}
