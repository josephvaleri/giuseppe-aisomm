import { createServiceClient } from '@/lib/supabase/server'

interface AppellationResult {
  appellation: string
  classification: string
  founded_year: string
  major_grapes: string
}

/**
 * Search for appellations from a specific region
 * Logic: countries_regions.wine_region -> region_id -> appellation.region_id -> appellation.appellation
 */
export async function searchAppellationsByRegion(regionName: string): Promise<AppellationResult[]> {
  const supabase = createServiceClient()

  console.log('Searching for appellations in region:', regionName)

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

    // Step 2: Find all appellations from these regions
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation, classification, founded_year, major_grapes')
      .in('region_id', regionIds)

    console.log('Appellations found for region:', appellations?.length || 0)

    if (appellationsError) {
      console.error('Error fetching appellations for region:', appellationsError)
      return []
    }

    if (!appellations || appellations.length === 0) {
      console.log('No appellations found for region:', regionName)
      return []
    }

    return appellations.map(app => ({
      appellation: app.appellation,
      classification: app.classification || 'Not specified',
      founded_year: app.founded_year || 'Unknown',
      major_grapes: app.major_grapes || 'Various'
    }))

  } catch (error) {
    console.error('Unhandled error in searchAppellationsByRegion:', error)
    return []
  }
}

/**
 * Search for appellations from a specific region of a country
 * Logic: countries_regions.wine_region + country_name -> region_id -> appellation.region_id -> appellation.appellation
 * If region not found, fallback to country: countries_regions.country_name -> country_id -> appellation.country_id
 */
export async function searchAppellationsByCountryRegion(
  countryName: string, 
  regionName: string
): Promise<{appellations: AppellationResult[], usedFallback: boolean}> {
  const supabase = createServiceClient()

  console.log('Searching for appellations in region:', regionName, 'of country:', countryName)

  try {
    // Step 1: Try to find the specific region_id for the country and region name
    console.log('Looking for region:', regionName, 'in country:', countryName)
    const { data: region, error: regionError } = await supabase
      .from('countries_regions')
      .select('region_id, wine_region, country_name')
      .eq('country_name', countryName)
      .ilike('wine_region', regionName)
    
    console.log('Region query result:', region)

    console.log('Specific region found:', region?.length || 0)

    if (regionError) {
      console.error('Error fetching specific region:', regionError)
      return {appellations: [], usedFallback: false}
    }

    if (region && region.length > 0) {
      // Found region, get appellations by region_id
      const regionIds = region.map(r => r.region_id)
      
      const { data: appellations, error: appellationsError } = await supabase
        .from('appellation')
        .select('appellation, classification, founded_year, major_grapes')
        .in('region_id', regionIds)

      console.log('Appellations found for region:', appellations?.length || 0)

      if (appellationsError) {
        console.error('Error fetching appellations for region:', appellationsError)
        return []
      }

      if (appellations && appellations.length > 0) {
        return {
          appellations: appellations.map(app => ({
            appellation: app.appellation,
            classification: app.classification || 'Not specified',
            founded_year: app.founded_year || 'Unknown',
            major_grapes: app.major_grapes || 'Various'
          })),
          usedFallback: false
        }
      }
    }

    // Step 2: Fallback to country search if region not found or no appellations
    console.log('Region not found or no appellations, trying country fallback')
    
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

    // Step 3: Find all regions for this country, then get appellations
    const { data: regions, error: regionsError } = await supabase
      .from('countries_regions')
      .select('region_id')
      .in('country_id', countryIds)
    
    if (regionsError) {
      console.error('Error fetching regions for country:', regionsError)
      return []
    }
    
    if (!regions || regions.length === 0) {
      console.log('No regions found for country:', countryName)
      return []
    }
    
    const regionIds = regions.map(r => r.region_id)
    
    // Step 4: Find all appellations from these regions
    const { data: appellations, error: appellationsError } = await supabase
      .from('appellation')
      .select('appellation, classification, founded_year, major_grapes')
      .in('region_id', regionIds)

    console.log('Appellations found for country:', appellations?.length || 0)

    if (appellationsError) {
      console.error('Error fetching appellations for country:', appellationsError)
      return {appellations: [], usedFallback: true}
    }

    if (!appellations || appellations.length === 0) {
      console.log('No appellations found for country:', countryName)
      return {appellations: [], usedFallback: true}
    }

    return {
      appellations: appellations.map(app => ({
        appellation: app.appellation,
        classification: app.classification || 'Not specified',
        founded_year: app.founded_year || 'Unknown',
        major_grapes: app.major_grapes || 'Various'
      })),
      usedFallback: true
    }

  } catch (error) {
    console.error('Unhandled error in searchAppellationsByCountryRegion:', error)
    return {appellations: [], usedFallback: false}
  }
}

/**
 * Normalize appellation results to a consistent format for narrative formatting
 */
export function normalizeAppellationRows(
  appellations: AppellationResult[],
  regionName: string,
  countryName?: string
): Record<string, unknown>[] {
  if (appellations.length === 0) {
    return []
  }

  // Group appellations by region/country for a more cohesive narrative
  const normalizedRows = appellations.map(app => ({
    name: app.appellation,
    appellation_type: app.classification,
    country: countryName || 'Unknown',
    region: regionName || 'Unknown',
    founded_year: app.founded_year,
    primary_grapes: app.major_grapes ? app.major_grapes.split(',').map(g => g.trim()) : [],
    styles: [], // Could be enhanced with wine color/style data
    notes: [],
    typical_profile: [],
    alt_names: []
  }))

  return normalizedRows
}

export function formatAppellationResults(
  appellations: AppellationResult[],
  regionName: string,
  countryName?: string,
  isCountryFallback: boolean = false
): string {
  if (appellations.length === 0) {
    return `I couldn't find any appellations from ${countryName ? `${regionName} of ${countryName}` : regionName}.`
  }

  let response: string
  if (isCountryFallback) {
    response = `I cannot find a wine region in ${countryName} by that name, it may be an appellation inside a region. Here is a list of appellations in ${countryName}:\n\n`
  } else {
    const location = countryName ? `${regionName} of ${countryName}` : regionName
    response = `Here are the wine appellations from ${location}:\n\n`
  }

  appellations.forEach(app => {
    response += `<strong>${app.appellation}</strong><br/>`
    response += `Classification: ${app.classification}<br/>`
    response += `Founded: ${app.founded_year}<br/>`
    response += `Major grapes: ${app.major_grapes}<br/><br/>`
  })

  return response
}
