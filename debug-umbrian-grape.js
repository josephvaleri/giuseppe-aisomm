// Simple test script to debug the Umbrian grape question
const question = "What Italian white grape, native to Umbria, has seen a revival in recent years and is often compared to Riesling for its freshness and acidity?"
const lowerQuestion = question.toLowerCase()

console.log('Question:', question)
console.log('Lower question:', lowerQuestion)
console.log('Contains "grape":', lowerQuestion.includes('grape'))
console.log('Contains "variety":', lowerQuestion.includes('variety'))
console.log('Contains "riesling":', lowerQuestion.includes('riesling'))
console.log('Contains "italian":', lowerQuestion.includes('italian'))
console.log('Contains "umbria":', lowerQuestion.includes('umbria'))

// Test the grape keywords array
const grapeKeywords = ['chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon', 'riesling', 
                      'syrah', 'shiraz', 'malbec', 'tempranillo', 'sangiovese', 'nebbiolo', 
                      'barbera', 'dolcetto', 'vermentino', 'pinot grigio', 'gewürztraminer',
                      'sagrantino', 'montefalco', 'montepulciano', 'agiorgitiko', 'moschofilero',
                      'assyrtiko', 'xinomavro', 'mavrodaphne', 'limnio', 'negroamaro', 'primitivo',
                      'nero d\'avola', 'corvina', 'rondinella', 'molinara', 'lagrein', 'schiava',
                      'vernaccia', 'trebbiano', 'moscato', 'brachetto', 'freisa', 'grignolino',
                      'bonarda', 'cortese', 'favorita', 'erbaluce', 'glera', 'falanghina', 'fiano',
                      'greco', 'canaiolo', 'colorino', 'ciliegiolo', 'pugnitello', 'cannonau']

console.log('\nChecking grape keywords:')
let foundGrapeName = undefined
for (const grape of grapeKeywords) {
  if (lowerQuestion.includes(grape)) {
    foundGrapeName = grape
    console.log('Found grape keyword:', grape)
    break
  }
}
console.log('Extracted grape name:', foundGrapeName)

// Test country extraction
const countries = ['italy', 'italian', 'france', 'french', 'spain', 'spanish', 'germany', 'german', 
                  'portugal', 'portuguese', 'greece', 'greek', 'australia', 'australian',
                  'chile', 'chilean', 'argentina', 'argentinian', 'south africa', 'south african', 
                  'new zealand', 'usa', 'american', 'california', 'californian',
                  'oregon', 'washington', 'canada', 'canadian', 'austria', 'austrian', 
                  'hungary', 'hungarian', 'romania', 'romanian', 'bulgaria', 'bulgarian',
                  'croatia', 'croatian', 'slovenia', 'slovenian', 'serbia', 'serbian', 
                  'moldova', 'moldovan', 'georgia', 'georgian', 'turkey', 'turkish', 
                  'lebanon', 'lebanese', 'israel', 'israeli', 'japan', 'japanese', 
                  'china', 'chinese', 'india', 'indian', 'brazil', 'brazilian', 
                  'mexico', 'mexican', 'uruguay', 'uruguayan', 'peru', 'peruvian']

console.log('\nChecking countries:')
let foundCountryName = undefined
for (const country of countries) {
  if (lowerQuestion.includes(country)) {
    foundCountryName = country
    console.log('Found country:', country)
    break
  }
}
console.log('Extracted country name:', foundCountryName)

// Test region extraction
const regions = ['tuscany', 'piedmont', 'umbria', 'lazio', 'marche', 'abruzzo', 'puglia',
                'campania', 'sicily', 'sardinia', 'lombardy', 'veneto', 'friuli', 'emilia-romagna',
                'liguria', 'calabria', 'molise', 'burgundy', 'bordeaux', 'champagne', 'loire',
                'rhone', 'alsace', 'languedoc', 'provence', 'jura', 'savoie', 'rioja', 'catalonia',
                'valencia', 'andalusia', 'galicia', 'castilla', 'extremadura', 'navarra',
                'bekaa valley', 'mount lebanon', 'batroun', 'barossa valley', 'hunter valley',
                'mclaren vale', 'yarra valley', 'coonawarra', 'margaret river', 'napa valley',
                'sonoma', 'central coast', 'willamette valley', 'columbia valley', 'finger lakes',
                'niagara', 'okanagan', 'fraser valley', 'mosel', 'rheingau', 'pfalz', 'baden',
                'wurttemberg', 'franken', 'aargau', 'valais', 'vaud', 'geneva', 'ticino']

console.log('\nChecking regions:')
let foundRegionName = undefined
for (const region of regions) {
  if (lowerQuestion.includes(region)) {
    foundRegionName = region
    console.log('Found region:', region)
    break
  }
}
console.log('Extracted region name:', foundRegionName)

console.log('\nFinal extracted values:')
console.log('- Grape name:', foundGrapeName)
console.log('- Country name:', foundCountryName)
console.log('- Region name:', foundRegionName)
