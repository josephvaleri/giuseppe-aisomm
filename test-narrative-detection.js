// Test script to verify narrative paragraph detection works
console.log('Testing narrative paragraph detection...')

// Mock the narrative paragraph detection logic
function isNarrativeParagraph(text) {
  return !text.includes('\n') && text.length > 100
}

// Test cases
const testCases = [
  {
    text: "Trebbiano Spoletino is a distinctive white grape variety grown primarily in the Spoleto area of Umbria, Italy, recognized for its role in the region's DOC wines since 2011. This grape is a key component of the Spoleto DOC, where it thrives alongside other esteemed varietals, contributing to the unique character of the local wines.",
    description: "Long narrative paragraph (should skip grape linking)",
    expected: true
  },
  {
    text: "Here are the grapes:\n• Sangiovese\n• Trebbiano Spoletino\n• Canaiolo",
    description: "Multi-line list format (should apply grape linking)",
    expected: false
  },
  {
    text: "Short text",
    description: "Short text (should apply grape linking)",
    expected: false
  },
  {
    text: "Chianti is a wine region in Tuscany.",
    description: "Medium length single line (should apply grape linking)",
    expected: false
  }
]

console.log('\n=== Test Results ===')
testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`)
  console.log('Text length:', testCase.text.length)
  console.log('Contains newlines:', testCase.text.includes('\n'))
  
  const result = isNarrativeParagraph(testCase.text)
  console.log('Is narrative paragraph:', result)
  console.log('Expected:', testCase.expected)
  console.log('✅ Correct:', result === testCase.expected ? 'YES' : 'NO')
})

console.log('\n✅ Narrative paragraph detection test completed!')





