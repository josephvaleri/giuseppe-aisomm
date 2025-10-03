// Test script to verify grape linking works with multi-word grape names
console.log('Testing grape linking with multi-word grape names...')

// Mock the regex replacement logic
function testGrapeLinking(text, grapeName) {
  const escapedGrapeName = grapeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?<!\\w)${escapedGrapeName}(?!\\w)`, 'gi')
  const replacement = `<span class="grape-link" data-grape-name="${grapeName}" style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">${grapeName}</span>`
  return text.replace(regex, replacement)
}

// Test cases
const testCases = [
  {
    text: "The primary grapes include Trebbiano Spoletino and Gamay del Trasimeno.",
    grapeName: "Trebbiano Spoletino",
    description: "Multi-word grape name in middle of sentence"
  },
  {
    text: "Trebbiano Spoletino is a white grape from Umbria.",
    grapeName: "Trebbiano Spoletino", 
    description: "Multi-word grape name at start of sentence"
  },
  {
    text: "We grow Sangiovese, Trebbiano Spoletino, and other varieties.",
    grapeName: "Trebbiano Spoletino",
    description: "Multi-word grape name in list"
  },
  {
    text: "Trebbiano Spoletino and Trebbiano Spoletino are the same grape.",
    grapeName: "Trebbiano Spoletino",
    description: "Multiple occurrences of same grape"
  }
]

console.log('\n=== Test Results ===')
testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`)
  console.log('Original:', testCase.text)
  
  const result = testGrapeLinking(testCase.text, testCase.grapeName)
  console.log('Result:', result)
  
  // Check if the replacement worked correctly
  const hasProperTag = result.includes(`<span class="grape-link" data-grape-name="${testCase.grapeName}"`)
  const hasNoMalformedHTML = !result.includes('style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">Trebbiano Spoletino')
  
  console.log('✅ Proper tag:', hasProperTag)
  console.log('✅ No malformed HTML:', hasNoMalformedHTML)
})

console.log('\n✅ Grape linking test completed!')

