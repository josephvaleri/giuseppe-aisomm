// Final test script to debug the relevance check logic
const question = "What Italian white grape, native to Umbria, has seen a revival in recent years and is often compared to Riesling for its freshness and acidity?"
const lowerQuestion = question.toLowerCase()

console.log('Question:', question)
console.log('Lower question:', lowerQuestion)

// Simulate the extracted values
const grapeName = 'riesling'
const countryName = 'italian' 
const regionName = 'umbria'

console.log('\nExtracted values:')
console.log('- grapeName:', grapeName)
console.log('- countryName:', countryName)
console.log('- regionName:', regionName)

// Simulate the database results (what we're getting)
const grapeResults = [
  {
    grape_variety: 'Riesling',
    flavor: 'Lime, green apple; petrol with age.',
    notable_wines: 'Mosel, Rheingau, Clare/Eden Valley, Alsace, Finger Lakes'
  },
  {
    grape_variety: 'Riesling Italico',
    flavor: 'Citrus, stone fruit, floral notes; typically medium acidity.',
    notable_wines: 'Alsace, Alsace Grand Cru, Crmant dAlsace, Tokat (Narince), Black Sea'
  },
  {
    grape_variety: 'Riesling Sylvaner',
    flavor: 'Citrus, stone fruit, floral notes; typically medium acidity.',
    notable_wines: 'Aargau, Alsace, Alsace Grand Cru, Crmant dAlsace, Tokat (Narince)'
  }
]

console.log('\nDatabase results:')
grapeResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.grape_variety}`)
  console.log(`   Flavor: ${result.flavor}`)
  console.log(`   Notable wines: ${result.notable_wines}`)
})

// Test the relevance check logic
console.log('\n=== TESTING RELEVANCE CHECK ===')

const isRelevant = grapeResults.some(result => {
  const resultText = `${result.grape_variety} ${result.flavor || ''} ${result.notable_wines || ''}`.toLowerCase()
  const queryText = lowerQuestion
  
  console.log(`\nChecking result: ${result.grape_variety}`)
  console.log(`resultText: ${resultText}`)
  
  // For questions asking for a grape from a specific region/country,
  // the result must actually mention that region/country
  if (queryText.includes('native to') || queryText.includes('from') || queryText.includes('in')) {
    console.log('Question asks for grape from specific place')
    // This is asking for a grape from a specific place
    if (regionName && !resultText.includes(regionName.toLowerCase())) {
      console.log(`❌ Result ${result.grape_variety} doesn't mention region ${regionName}`)
      return false
    }
    if (countryName && countryName === 'italian' && !resultText.includes('italy') && !resultText.includes('italian')) {
      console.log(`❌ Result ${result.grape_variety} doesn't mention Italian/Italy`)
      return false
    }
  }
  
  // For questions about specific regions/countries, the result must mention that region/country
  if (queryText.includes('umbria') && !resultText.includes('umbria')) {
    console.log(`❌ Result ${result.grape_variety} doesn't mention Umbria`)
    return false
  }
  if (queryText.includes('italian') && !resultText.includes('italy') && !resultText.includes('italian')) {
    console.log(`❌ Result ${result.grape_variety} doesn't mention Italian/Italy`)
    return false
  }
  
  // If we get here, the result is relevant
  console.log(`✅ Result ${result.grape_variety} is relevant`)
  return true
})

console.log('\n=== FINAL RESULT ===')
console.log('Overall relevance:', isRelevant)

if (isRelevant) {
  console.log('❌ PROBLEM: Results are considered relevant, so system will return database results instead of falling back to OpenAI')
} else {
  console.log('✅ SUCCESS: Results are not relevant, system should fall back to OpenAI')
}
