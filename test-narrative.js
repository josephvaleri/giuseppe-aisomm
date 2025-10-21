// Simple test script to verify narrative formatting works
const { toParagraphFallback, validateParagraph } = require('./src/lib/formatting/narrative.ts')

console.log('Testing narrative formatting...')

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





