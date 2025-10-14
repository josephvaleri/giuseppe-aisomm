/**
 * Mock Vision API for development/testing
 * Avoids API costs when USE_MOCK_VISION=true
 */

import { ParsedLabel, ParsingHint } from './ocr-parser'

/**
 * Mock function that returns sample wine data
 * Used when USE_MOCK_VISION=true to avoid API costs during testing
 */
export function mockExtractWineData(hint?: ParsingHint): ParsedLabel {
  // Return hint data if provided, otherwise return sample data
  return {
    producer: hint?.producer || 'Antinori',
    wine_name: hint?.wine_name || 'Tignanello',
    vintage: hint?.vintage || 2019,
    alcohol_percent: 14.0,
    confidence: {
      producer: hint?.producer ? 0.9 : 0.8,
      wine_name: hint?.wine_name ? 0.9 : 0.8,
      vintage: hint?.vintage ? 0.9 : 0.8,
      alcohol_percent: 0.8
    },
    raw_text: `${hint?.producer || 'Antinori'}\n${hint?.wine_name || 'Tignanello'}\n${hint?.vintage || '2019'}\n14.0% vol`
  }
}

