import { createServiceClient } from '@/lib/supabase/server'

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
 * Simple logic: countries_regions.wine_region -> region_id -> wines.region_id
 */
export async function searchWinesByRegion(regionName: string): Promise<WineResult[]> {
  const supabase = createServiceClient()

  console.log('Searching for wines in region:', regionName)

  try {
    // Step 1: Find the region_id for the region name
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .ilike('wine_region', regionName)

    console.log('Region found:', region?.length || 0)

    if (regionError) {
      console.error('Error fetching region:', regionError)
      return []
    }

    if (!region || region.length === 0) {
      console.log('No region found for:', regionName)
      return []
    }

    const regionIds = region.map(r => r.region_id)

    // Step 2: Find all wines from these regions
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select('wine_name, producer, vintage, color, alcohol')
      .in('region_id', regionIds)

    console.log('Wines found for region:', wines?.length || 0)

    if (winesError) {
      console.error('Error fetching wines for region:', winesError)
      return []
    }

    if (!wines || wines.length === 0) {
      console.log('No wines found for region:', regionName)
      return []
    }

    return wines.map(wine => ({
      wine_name: wine.wine_name,
      producer: wine.producer,
      vintage: wine.vintage || 'NV',
      color: wine.color || 'Not specified',
      alcohol: wine.alcohol || 'Not specified',
      appellation: regionName // Use the region name as appellation
    }))

  } catch (error) {
    console.error('Unhandled error in searchWinesByRegion:', error)
    return []
  }
}

/**
 * Search for wines from a specific region of a country
 * Simple logic: countries_regions.wine_region + country_name -> region_id -> wines.region_id
 * If region not found, fallback to country: countries_regions.country_name -> country_id -> wines.country_id
 */
export async function searchWinesByCountryRegion(countryName: string, regionName: string): Promise<WineResult[]> {
  const supabase = createServiceClient()

  console.log('Searching for wines in region:', regionName, 'of country:', countryName)

  try {
    // Step 1: Try to find the specific region_id for the country and region name
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .eq('country_name', countryName)
      .ilike('wine_region', regionName)

    console.log('Specific region found:', region?.length || 0)

    if (regionError) {
      console.error('Error fetching specific region:', regionError)
      return []
    }

    if (region && region.length > 0) {
      // Found region, get wines by region_id
      const regionIds = region.map(r => r.region_id)
      
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('wine_name, producer, vintage, color, alcohol')
        .in('region_id', regionIds)

      console.log('Wines found for region:', wines?.length || 0)

      if (winesError) {
        console.error('Error fetching wines for region:', winesError)
        return []
      }

      if (wines && wines.length > 0) {
        return wines.map(wine => ({
          wine_name: wine.wine_name,
          producer: wine.producer,
          vintage: wine.vintage || 'NV',
          color: wine.color || 'Not specified',
          alcohol: wine.alcohol || 'Not specified',
          appellation: `${regionName}, ${countryName}`
        }))
      }
    }

    // Step 2: Fallback to country search if region not found or no wines
    console.log('Region not found or no wines, trying country fallback')
    
    const { data: country, error: countryError } = await supabase
      .from('countries_regions')
      .select('country_id')
      .eq('country_name', countryName)

    console.log('Country found:', country?.length || 0)

    if (countryError) {
      console.error('Error fetching country:', countryError)
      return []
    }

    if (!country || country.length === 0) {
      console.log('No country found for:', countryName)
      return []
    }

    const countryIds = country.map(c => c.country_id)

    // Step 3: Find all wines from this country
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select('wine_name, producer, vintage, color, alcohol')
      .in('country_id', countryIds)

    console.log('Wines found for country:', wines?.length || 0)

    if (winesError) {
      console.error('Error fetching wines for country:', winesError)
      return []
    }

    if (!wines || wines.length === 0) {
      console.log('No wines found for country:', countryName)
      return []
    }

    return wines.map(wine => ({
      wine_name: wine.wine_name,
      producer: wine.producer,
      vintage: wine.vintage || 'NV',
      color: wine.color || 'Not specified',
      alcohol: wine.alcohol || 'Not specified',
      appellation: countryName
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
