const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getVocabulary() {
  try {
    // Get all appellations
    const { data: appellations, error: appError } = await supabase
      .from('appellation')
      .select('appellation')
      .not('appellation', 'is', null)
      .neq('appellation', '')

    // Get all grape varieties
    const { data: grapes, error: grapeError } = await supabase
      .from('grapes')
      .select('grape_variety')
      .not('grape_variety', 'is', null)
      .neq('grape_variety', '')

    // Get all wine regions
    const { data: regions, error: regionError } = await supabase
      .from('countries_regions')
      .select('wine_region')
      .not('wine_region', 'is', null)
      .neq('wine_region', '')

    if (appError) console.error('Appellation error:', appError)
    if (grapeError) console.error('Grape error:', grapeError)
    if (regionError) console.error('Region error:', regionError)

    console.log('=== APPELLATIONS ===')
    appellations?.forEach(item => console.log(`'${item.appellation.toLowerCase()}',`))

    console.log('\n=== GRAPE VARIETIES ===')
    grapes?.forEach(item => console.log(`'${item.grape_variety.toLowerCase()}',`))

    console.log('\n=== WINE REGIONS ===')
    regions?.forEach(item => console.log(`'${item.wine_region.toLowerCase()}',`))

  } catch (error) {
    console.error('Error:', error)
  }
}

getVocabulary()
