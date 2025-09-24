import { createClient } from '@/lib/supabase/server'

interface GrapeResult {
  grape_id: number
  grape_variety: string
  wine_color: string
  notable_wines: string
  flavor: string
  appellations: string[]
}

/**
 * Search for grapes used in a specific country
 * Follows the relationship chain: country -> regions -> appellations -> grapes
 */
export async function searchGrapesByCountry(countryName: string): Promise<GrapeResult[]> {
  const supabase = createClient()
  
  try {
    // Step 1: Find all region_ids for the country
    const { data: regions, error: regionsError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .eq('country_name', countryName)

    if (regionsError) {
      console.error('Error fetching regions:', regionsError)
      return []
    }

    if (!regions || regions.length === 0) {
      console.log(`No regions found for country: ${countryName}`)
      return []
    }

    const regionIds = regions.map(r => r.region_id)

    // Step 2: Find all appellation_ids for these regions
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation_id, appellation')
      .in('region_id', regionIds)

    if (appellationsError) {
      console.error('Error fetching appellations:', appellationsError)
      return []
    }

    if (!appellations || appellations.length === 0) {
      console.log(`No appellations found for regions in ${countryName}`)
      return []
    }

    const appellationIds = appellations.map(a => a.appellation_id)
    const appellationNames = appellations.map(a => a.appellation)

    // Step 3: Find all grape_ids used in these appellations
    const { data: grapeAppellations, error: grapeAppellationsError } = await supabase
      .from('join_grape_appellation')
      .select('grape_id')
      .in('appellation_id', appellationIds)

    if (grapeAppellationsError) {
      console.error('Error fetching grape-appellation relationships:', grapeAppellationsError)
      return []
    }

    if (!grapeAppellations || grapeAppellations.length === 0) {
      console.log(`No grapes found for appellations in ${countryName}`)
      return []
    }

    const grapeIds = [...new Set(grapeAppellations.map(ga => ga.grape_id))]

    // Step 4: Get grape details
    const { data: grapes, error: grapesError } = await supabase
      .from('grapes')
      .select('grape_id, grape_variety, wine_color, notable_wines, flavor')
      .in('grape_id', grapeIds)

    if (grapesError) {
      console.error('Error fetching grape details:', grapesError)
      return []
    }

    // Step 5: Map grapes to their appellations
    const grapeAppellationMap = new Map<number, string[]>()
    
    for (const grapeAppellation of grapeAppellations) {
      const appellationId = grapeAppellation.appellation_id
      const grapeId = grapeAppellation.grape_id
      
      // Find appellation name
      const appellation = appellations.find(a => a.appellation_id === appellationId)
      if (appellation) {
        if (!grapeAppellationMap.has(grapeId)) {
          grapeAppellationMap.set(grapeId, [])
        }
        grapeAppellationMap.get(grapeId)!.push(appellation.appellation)
      }
    }

    // Step 6: Format results
    const results: GrapeResult[] = (grapes || []).map(grape => ({
      grape_id: grape.grape_id,
      grape_variety: grape.grape_variety,
      wine_color: grape.wine_color,
      notable_wines: grape.notable_wines,
      flavor: grape.flavor,
      appellations: grapeAppellationMap.get(grape.grape_id) || []
    }))

    console.log(`Found ${results.length} grapes for ${countryName}`)
    return results

  } catch (error) {
    console.error('Error in searchGrapesByCountry:', error)
    return []
  }
}

/**
 * Search for grapes used in a specific region of a country
 */
export async function searchGrapesByRegion(countryName: string, regionName: string): Promise<GrapeResult[]> {
  const supabase = createClient()
  
  try {
    // Step 1: Find region_id for the specific region in the country
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .eq('country_name', countryName)
      .eq('region_name', regionName)
      .single()

    if (regionError || !region) {
      console.log(`Region ${regionName} not found in ${countryName}`)
      return []
    }

    // Step 2: Find all appellation_ids for this region
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation_id, appellation')
      .eq('region_id', region.region_id)

    if (appellationsError) {
      console.error('Error fetching appellations:', appellationsError)
      return []
    }

    if (!appellations || appellations.length === 0) {
      console.log(`No appellations found for region ${regionName} in ${countryName}`)
      return []
    }

    const appellationIds = appellations.map(a => a.appellation_id)

    // Step 3: Find all grape_ids used in these appellations
    const { data: grapeAppellations, error: grapeAppellationsError } = await supabase
      .from('join_grape_appellation')
      .select('grape_id')
      .in('appellation_id', appellationIds)

    if (grapeAppellationsError) {
      console.error('Error fetching grape-appellation relationships:', grapeAppellationsError)
      return []
    }

    if (!grapeAppellations || grapeAppellations.length === 0) {
      console.log(`No grapes found for appellations in ${regionName}, ${countryName}`)
      return []
    }

    const grapeIds = [...new Set(grapeAppellations.map(ga => ga.grape_id))]

    // Step 4: Get grape details
    const { data: grapes, error: grapesError } = await supabase
      .from('grapes')
      .select('grape_id, grape_variety, wine_color, notable_wines, flavor')
      .in('grape_id', grapeIds)

    if (grapesError) {
      console.error('Error fetching grape details:', grapesError)
      return []
    }

    // Step 5: Map grapes to their appellations
    const grapeAppellationMap = new Map<number, string[]>()
    
    for (const grapeAppellation of grapeAppellations) {
      const appellationId = grapeAppellation.appellation_id
      const grapeId = grapeAppellation.grape_id
      
      const appellation = appellations.find(a => a.appellation_id === appellationId)
      if (appellation) {
        if (!grapeAppellationMap.has(grapeId)) {
          grapeAppellationMap.set(grapeId, [])
        }
        grapeAppellationMap.get(grapeId)!.push(appellation.appellation)
      }
    }

    // Step 6: Format results
    const results: GrapeResult[] = (grapes || []).map(grape => ({
      grape_id: grape.grape_id,
      grape_variety: grape.grape_variety,
      wine_color: grape.wine_color,
      notable_wines: grape.notable_wines,
      flavor: grape.flavor,
      appellations: grapeAppellationMap.get(grape.grape_id) || []
    }))

    console.log(`Found ${results.length} grapes for ${regionName}, ${countryName}`)
    return results

  } catch (error) {
    console.error('Error in searchGrapesByRegion:', error)
    return []
  }
}

/**
 * Format grape results into a readable answer
 */
export function formatGrapeResults(grapeResults: GrapeResult[], countryName: string, regionName?: string): string {
  if (grapeResults.length === 0) {
    return `I couldn't find any grape varieties used in ${regionName ? `${regionName}, ` : ''}${countryName}.`
  }

  const location = regionName ? `${regionName}, ${countryName}` : countryName
  let answer = `Here are the grape varieties commonly used in ${location}:\n\n`

  // Group by wine color
  const redGrapes = grapeResults.filter(g => g.wine_color.toLowerCase().includes('red'))
  const whiteGrapes = grapeResults.filter(g => g.wine_color.toLowerCase().includes('white'))
  const otherGrapes = grapeResults.filter(g => 
    !g.wine_color.toLowerCase().includes('red') && 
    !g.wine_color.toLowerCase().includes('white')
  )

  if (redGrapes.length > 0) {
    answer += `**Red Grapes:**\n`
    redGrapes.forEach(grape => {
      answer += `• **${grape.grape_variety}** (${grape.wine_color})\n`
      if (grape.flavor) {
        answer += `  Flavor: ${grape.flavor}\n`
      }
      if (grape.appellations.length > 0) {
        answer += `  Used in: ${grape.appellations.join(', ')}\n`
      }
      answer += `\n`
    })
  }

  if (whiteGrapes.length > 0) {
    answer += `**White Grapes:**\n`
    whiteGrapes.forEach(grape => {
      answer += `• **${grape.grape_variety}** (${grape.wine_color})\n`
      if (grape.flavor) {
        answer += `  Flavor: ${grape.flavor}\n`
      }
      if (grape.appellations.length > 0) {
        answer += `  Used in: ${grape.appellations.join(', ')}\n`
      }
      answer += `\n`
    })
  }

  if (otherGrapes.length > 0) {
    answer += `**Other Grapes:**\n`
    otherGrapes.forEach(grape => {
      answer += `• **${grape.grape_variety}** (${grape.wine_color})\n`
      if (grape.flavor) {
        answer += `  Flavor: ${grape.flavor}\n`
      }
      if (grape.appellations.length > 0) {
        answer += `  Used in: ${grape.appellations.join(', ')}\n`
      }
      answer += `\n`
    })
  }

  return answer
}
