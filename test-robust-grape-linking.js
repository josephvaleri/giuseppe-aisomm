// Test script to verify robust grape linking works with multi-word grape names
console.log('Testing robust grape linking with multi-word grape names...')

// Mock the robust grape linking logic
function testRobustGrapeLinking(text, grapeName) {
  const escapedGrapeName = grapeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Use word boundaries that work better with multi-word phrases
  const regex = new RegExp(`(^|[^\\w])${escapedGrapeName}([^\\w]|$)`, 'gi')
  const replacement = `$1<span class="grape-link" data-grape-name="${grapeName}" style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">${grapeName}</span>$2`
  return text.replace(regex, replacement)
}

// Test cases
const testCases = [
  {
    text: "Trebbiano Spoletino is a distinctive white grape variety grown primarily in the Spoleto area of Umbria, Italy, recognized for its role in the region's DOC wines since 2011. This grape is a key component of the Spoleto DOC, where it thrives alongside other esteemed varietals, contributing to the unique character of the local wines. Trebbiano Spoletino is celebrated for its fresh acidity and aromatic profile, making it an excellent choice for crafting vibrant, food-friendly wines.",
    grapeName: "Trebbiano Spoletino",
    description: "Narrative paragraph with multiple occurrences of Trebbiano Spoletino"
  },
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
    description: "Multi-word grape name in list with punctuation"
  },
  {
    text: "Trebbiano Spoletino and Trebbiano Spoletino are the same grape.",
    grapeName: "Trebbiano Spoletino",
    description: "Multiple occurrences of same grape"
  },
  {
    text: "The Trebbiano Spoletino grape variety is excellent.",
    grapeName: "Trebbiano Spoletino",
    description: "Multi-word grape name followed by 'grape variety'"
  }
]

console.log('\n=== Test Results ===')
testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`)
  console.log('Original:', testCase.text)
  
  const result = testRobustGrapeLinking(testCase.text, testCase.grapeName)
  console.log('Result:', result)
  
  // Check if the replacement worked correctly
  const hasProperTag = result.includes(`<span class="grape-link" data-grape-name="${testCase.grapeName}"`)
  const hasNoMalformedHTML = !result.includes('style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">Trebbiano Spoletino')
  const hasNoPartialTags = !result.includes('Trebbiano Spoletino" style=')
  
  console.log('✅ Proper tag:', hasProperTag)
  console.log('✅ No malformed HTML:', hasNoMalformedHTML)
  console.log('✅ No partial tags:', hasNoPartialTags)
  
  // Count occurrences to make sure all instances were replaced
  const originalCount = (testCase.text.match(new RegExp(testCase.grapeName, 'gi')) || []).length
  const resultCount = (result.match(new RegExp(`<span class="grape-link" data-grape-name="${testCase.grapeName}"`, 'gi')) || []).length
  console.log('✅ All instances replaced:', originalCount === resultCount ? 'YES' : 'NO')
})

console.log('\n✅ Robust grape linking test completed!')





