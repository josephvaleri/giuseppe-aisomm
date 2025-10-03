import { toParagraphFallback, validateParagraph } from '../src/lib/formatting/narrative'

describe('Narrative Formatting', () => {
  test('produces one paragraph without lists and within word cap', () => {
    const md = toParagraphFallback({
      question: "Chianti overview",
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
    })
    
    // No bullets / numbers:
    expect(/^\s*[-*0-9]+\./m.test(md)).toBe(false)
    // One paragraph (no blank lines):
    expect(md.trim().split(/\n{2,}/).length).toBe(1)
    // Word cap:
    expect(md.split(/\s+/).length).toBeLessThanOrEqual(180)
    // Contains expected content:
    expect(md.toLowerCase()).toContain('chianti')
    expect(md.toLowerCase()).toContain('tuscany')
    expect(md.toLowerCase()).toContain('italy')
  })

  test('handles empty rows gracefully', () => {
    const md = toParagraphFallback({
      question: "Unknown wine",
      rows: [],
      domain: "wine",
      maxWords: 180
    })
    
    expect(md).toContain('couldn\'t find any relevant information')
    expect(md).toContain('Unknown wine')
    expect(md.split(/\s+/).length).toBeLessThanOrEqual(180)
  })

  test('validates paragraph format correctly', () => {
    const goodParagraph = "Chianti, an appellation in Tuscany, Italy, is traditionally centered on Sangiovese with supporting varieties such as Canaiolo."
    const badParagraph = "Chianti:\n• Sangiovese\n• Canaiolo\n\nLocated in Tuscany, Italy."
    
    expect(validateParagraph(goodParagraph)).toBe(true)
    expect(validateParagraph(badParagraph)).toBe(false)
  })

  test('handles multiple grape varieties in one paragraph', () => {
    const md = toParagraphFallback({
      question: "Tuscany grapes",
      rows: [{
        name: "Tuscany Red Grapes",
        grape_variety: ["Sangiovese", "Canaiolo", "Colorino"],
        wine_color: "red",
        country: "Italy",
        region: "Tuscany",
        styles: ["dry red"],
        typical_profile: ["structured", "tannic"]
      }],
      domain: "wine",
      maxWords: 180
    })
    
    expect(md.toLowerCase()).toContain('sangiovese')
    expect(md.toLowerCase()).toContain('canaiolo')
    expect(md.toLowerCase()).toContain('tuscany')
    expect(md.split(/\s+/).length).toBeLessThanOrEqual(180)
  })

  test('respects word limit strictly', () => {
    const md = toParagraphFallback({
      question: "Long wine description",
      rows: [{
        name: "Very Long Wine Name That Should Be Truncated",
        country: "A Very Long Country Name",
        region: "An Extremely Long Regional Name That Goes On And On",
        primary_grapes: ["Very Long Grape Variety Name One", "Very Long Grape Variety Name Two", "Very Long Grape Variety Name Three"],
        styles: ["very long wine style description"],
        typical_profile: ["extremely long flavor profile description that should definitely exceed word limits"]
      }],
      domain: "wine",
      maxWords: 50 // Very strict limit
    })
    
    expect(md.split(/\s+/).length).toBeLessThanOrEqual(50)
    expect(md.endsWith('...')).toBe(true)
  })
})

