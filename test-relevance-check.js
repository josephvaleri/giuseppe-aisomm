// Test script to debug the relevance check logic
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
  
  const relevanceChecks = {
    grapeNameMatch: grapeName && resultText.includes(grapeName),
    countryMatch: countryName && resultText.includes(countryName),
    regionMatch: regionName && resultText.includes(regionName),
    umbriaMatch: queryText.includes('umbria') && resultText.includes('umbria'),
    italianMatch: queryText.includes('italian') && resultText.includes('italy'),
    rieslingMatch: queryText.includes('riesling') && result.grape_variety.toLowerCase().includes('riesling')
  }
  
  console.log('Relevance checks:', relevanceChecks)
  
  // Test the new relevance logic
  console.log('\n--- Testing new relevance logic ---')
  
  // For questions about specific regions/countries, the result must mention that region/country
  if (queryText.includes('umbria') && !resultText.includes('umbria')) {
    console.log('❌ FAIL: Question mentions Umbria but result does not')
    return false
  }
  if (queryText.includes('italian') && !resultText.includes('italy') && !resultText.includes('italian')) {
    console.log('❌ FAIL: Question mentions Italian but result does not mention Italy/Italian')
    return false
  }
  
  // For questions asking for a specific grape variety native to a region,
  // don't just return any grape that matches the name - it must be from that region
  if (queryText.includes('native to') || queryText.includes('from') || queryText.includes('in')) {
    console.log('Question asks for grape native to/from/in a specific place')
    // This is asking for a grape from a specific place
    if (regionName && !resultText.includes(regionName.toLowerCase())) {
      console.log('❌ FAIL: Question asks for grape from', regionName, 'but result does not mention', regionName)
      return false
    }
    if (countryName && countryName === 'italian' && !resultText.includes('italy') && !resultText.includes('italian')) {
      console.log('❌ FAIL: Question asks for Italian grape but result does not mention Italy/Italian')
      return false
    }
  }
  
  // Only return true if we have a good match
  const finalCheck = (grapeName && resultText.includes(grapeName)) ||
                     (countryName && resultText.includes(countryName)) ||
                     (regionName && resultText.includes(regionName)) ||
                     // Check if the result actually answers the specific question
                     (queryText.includes('umbria') && resultText.includes('umbria')) ||
                     (queryText.includes('italian') && resultText.includes('italy')) ||
                     (queryText.includes('riesling') && result.grape_variety.toLowerCase().includes('riesling'))
  
  console.log('Final check result:', finalCheck)
  
  if (finalCheck) {
    console.log('✅ PASS: Result is considered relevant')
  } else {
    console.log('❌ FAIL: Result is not relevant')
  }
  
  return finalCheck
})

console.log('\n=== FINAL RESULT ===')
console.log('Overall relevance:', isRelevant)

if (isRelevant) {
  console.log('❌ PROBLEM: Results are considered relevant, so system will return database results instead of falling back to OpenAI')
} else {
  console.log('✅ SUCCESS: Results are not relevant, system should fall back to OpenAI')
}
