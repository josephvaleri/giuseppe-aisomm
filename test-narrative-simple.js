// Simple test script to verify narrative formatting works (fallback only)
console.log('Testing narrative formatting (fallback)...')

// Mock the toParagraphFallback function logic
function toParagraphFallback(input) {
  const { question, rows, maxWords = 180 } = input
  
  if (rows.length === 0) {
    return `I couldn't find any relevant information about "${question}". Please try asking about a specific wine region, grape variety, or appellation.`
  }

  const primaryRow = rows[0]
  const name = primaryRow.name || primaryRow.appellation || primaryRow.grape_variety || 'this wine'
  const country = primaryRow.country || primaryRow.country_name
  const region = primaryRow.region || primaryRow.wine_region
  
  let grapes = []
  if (primaryRow.primary_grapes && Array.isArray(primaryRow.primary_grapes)) {
    grapes = primaryRow.primary_grapes
  } else if (primaryRow.grape_variety) {
    grapes = [primaryRow.grape_variety]
  }
  
  let styles = []
  if (primaryRow.styles && Array.isArray(primaryRow.styles)) {
    styles = primaryRow.styles
  } else if (primaryRow.wine_color) {
    styles = [primaryRow.wine_color]
  }
  
  let profile = []
  if (primaryRow.typical_profile && Array.isArray(primaryRow.typical_profile)) {
    profile = primaryRow.typical_profile
  }

  let paragraph = `${name}`
  
  if (country && region) {
    paragraph += `, an appellation in ${region}, ${country}`
  } else if (country) {
    paragraph += ` from ${country}`
  } else if (region) {
    paragraph += ` from the ${region} region`
  }
  
  if (grapes.length > 0) {
    const grapeText = grapes.length === 1 
      ? `centers on ${grapes[0]}`
      : `traditionally features ${grapes.slice(0, 3).join(', ')}${grapes.length > 3 ? ' and other varieties' : ''}`
    paragraph += ` and ${grapeText}`
  }
  
  if (styles.length > 0) {
    paragraph += `. The wines are typically ${styles.join(' and ')}`
  }
  
  if (profile.length > 0) {
    paragraph += `, showing ${profile.slice(0, 3).join(', ')}`
  }
  
  paragraph += '.'
  
  if (rows.length > 1) {
    paragraph += ` Additional variations and styles exist within this category, reflecting the diversity of terroir and winemaking approaches.`
  }
  
  const words = paragraph.split(/\s+/)
  if (words.length > maxWords) {
    paragraph = words.slice(0, maxWords).join(' ') + '...'
  }
  
  return paragraph
}

function validateParagraph(text) {
  const hasLists = /^\s*[-*0-9]+\./m.test(text)
  const paragraphCount = text.trim().split(/\n{2,}/).length
  return !hasLists && paragraphCount <= 1
}

// Test 1: Basic Chianti example
const chiantiData = {
  question: "Tell me about wines from Chianti",
  rows: [{
    name: "Chianti",
    country: "Italy",
    region: "Tuscany",
    primary_grapes: ["Sangiovese", "Canaiolo"],
    styles: ["dry red"],
    typical_profile: ["bright acidity", "red cherry", "herbal notes"]
  }],
  domain: "wine",
  maxWords: 180
}

const result = toParagraphFallback(chiantiData)
console.log('\n=== Test Result ===')
console.log(result)
console.log('\n=== Validation ===')
console.log('Valid paragraph:', validateParagraph(result))
console.log('Word count:', result.split(/\s+/).length)
console.log('Contains lists:', /^\s*[-*0-9]+\./m.test(result))
console.log('Single paragraph:', result.trim().split(/\n{2,}/).length === 1)

console.log('\n✅ Narrative formatting test completed!')






