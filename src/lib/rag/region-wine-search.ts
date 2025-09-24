import { createClient } from '@/lib/supabase/client'

interface WineResult {
  wine_name: string
  producer: string
  vintage: string
  color: string
  alcohol: string
  appellation: string
}

/**
 * Search for wines from a specific region
 * Follows the relationship chain: region -> appellation -> wines
 */
export async function searchWinesByRegion(regionName: string): Promise<WineResult[]> {
  const supabase = createClient()

  console.log('Searching for wines in region:', regionName)

  try {
    // Step 1: Find the region_id for the region name
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .ilike('region_name', regionName)
      .single()

    console.log('Region found:', region ? 1 : 0)

    if (regionError) {
      console.error('Error fetching region:', regionError)
      return []
    }

    if (!region) {
      console.log('No region found for:', regionName)
      return []
    }

    // Step 2: Find all appellation_ids within this region
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation_id, appellation')
      .eq('region_id', region.region_id)

    console.log('Appellations found for region:', appellations?.length || 0)

    if (appellationsError) {
      console.error('Error fetching appellations for region:', appellationsError)
      return []
    }

    if (!appellations || appellations.length === 0) {
      console.log('No appellations found for region:', regionName)
      return []
    }

    const appellationIds = appellations.map(a => a.appellation_id)

    // Step 3: Find all wines from these appellations
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select('wine_name, producer, vintage, color, alcohol, region_id')
      .in('region_id', appellationIds)

    console.log('Wines found for region:', wines?.length || 0)

    if (winesError) {
      console.error('Error fetching wines for region:', winesError)
      return []
    }

    if (!wines || wines.length === 0) {
      console.log('No wines found for region:', regionName)
      return []
    }

    // Map appellation names to wines
    const wineAppellationMap = new Map<number, string>()
    for (const appellation of appellations) {
      wineAppellationMap.set(appellation.appellation_id, appellation.appellation)
    }

    return wines.map(wine => ({
      wine_name: wine.wine_name,
      producer: wine.producer,
      vintage: wine.vintage || 'NV',
      color: wine.color || 'Not specified',
      alcohol: wine.alcohol || 'Not specified',
      appellation: wineAppellationMap.get(wine.region_id) || 'Unknown'
    }))

  } catch (error) {
    console.error('Unhandled error in searchWinesByRegion:', error)
    return []
  }
}

/**
 * Search for wines from a specific region of a country
 * Follows the relationship chain: country -> region -> appellation -> wines
 */
export async function searchWinesByCountryRegion(countryName: string, regionName: string): Promise<WineResult[]> {
  const supabase = createClient()

  console.log('Searching for wines in region:', regionName, 'of country:', countryName)

  try {
    // Step 1: Find the specific region_id for the country and region name
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .eq('country_name', countryName)
      .ilike('region_name', regionName)
      .single()

    console.log('Specific region found:', region ? 1 : 0)

    if (regionError) {
      console.error('Error fetching specific region:', regionError)
      return []
    }

    if (!region) {
      console.log('No specific region found for:', regionName, 'in', countryName)
      return []
    }

    // Step 2: Find all appellation_ids within this specific region
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation_id, appellation')
      .eq('region_id', region.region_id)

    console.log('Appellations found for region:', appellations?.length || 0)

    if (appellationsError) {
      console.error('Error fetching appellations for region:', appellationsError)
      return []
    }

    if (!appellations || appellations.length === 0) {
      console.log('No appellations found for region:', regionName)
      return []
    }

    const appellationIds = appellations.map(a => a.appellation_id)

    // Step 3: Find all wines from these appellations
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select('wine_name, producer, vintage, color, alcohol, region_id')
      .in('region_id', appellationIds)

    console.log('Wines found for region:', wines?.length || 0)

    if (winesError) {
      console.error('Error fetching wines for region:', winesError)
      return []
    }

    if (!wines || wines.length === 0) {
      console.log('No wines found for region:', regionName)
      return []
    }

    // Map appellation names to wines
    const wineAppellationMap = new Map<number, string>()
    for (const appellation of appellations) {
      wineAppellationMap.set(appellation.appellation_id, appellation.appellation)
    }

    return wines.map(wine => ({
      wine_name: wine.wine_name,
      producer: wine.producer,
      vintage: wine.vintage || 'NV',
      color: wine.color || 'Not specified',
      alcohol: wine.alcohol || 'Not specified',
      appellation: wineAppellationMap.get(wine.region_id) || 'Unknown'
    }))

  } catch (error) {
    console.error('Unhandled error in searchWinesByCountryRegion:', error)
    return []
  }
}

export function formatWineResults(
  wines: WineResult[],
  regionName: string,
  countryName?: string
): string {
  if (wines.length === 0) {
    return `I couldn't find any wines from ${countryName ? `${regionName} of ${countryName}` : regionName}.`
  }

  const location = countryName ? `${regionName} of ${countryName}` : regionName
  let response = `Here are some wines from ${location}:\n\n`

  // Group by color
  const redWines = wines.filter(w => w.color && w.color.toLowerCase().includes('red'))
  const whiteWines = wines.filter(w => w.color && w.color.toLowerCase().includes('white'))
  const otherWines = wines.filter(w => 
    !w.color || 
    (!w.color.toLowerCase().includes('red') && 
     !w.color.toLowerCase().includes('white'))
  )

  if (redWines.length > 0) {
    const redWineNames = redWines.map(wine => `${wine.wine_name} (${wine.producer}, ${wine.vintage})`).join(', ')
    response += `Red Wines: ${redWineNames}\n\n`
  }

  if (whiteWines.length > 0) {
    const whiteWineNames = whiteWines.map(wine => `${wine.wine_name} (${wine.producer}, ${wine.vintage})`).join(', ')
    response += `White Wines: ${whiteWineNames}\n\n`
  }

  if (otherWines.length > 0) {
    const otherWineNames = otherWines.map(wine => `${wine.wine_name} (${wine.producer}, ${wine.vintage})`).join(', ')
    response += `Other Wines: ${otherWineNames}\n\n`
  }

  return response
}
