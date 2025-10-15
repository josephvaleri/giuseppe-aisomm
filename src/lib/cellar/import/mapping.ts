import { MappingTarget, ColumnMapping } from '@/lib/zod/cellar-import';

// CSV headers we recognize (case/space/punctuation-insensitive; synonyms)
export const RECOGNIZED_HEADERS = {
  wine_name: ['Wine', 'Wine Name', 'Name'],
  producer: ['Producer', 'Winery'],
  vintage: ['Vintage'],
  color: ['Color', 'Type'],
  alcohol: ['Alcohol', 'ABV'],
  bottle_size: ['Bottle Size', 'Format'],
  quantity: ['Qty', 'Quantity'],
  where_stored: ['Location', 'Bin'],
  value: ['Purchase Price', 'Price'],
  typical_price: ['Typical Price', 'Est Value'],
  currency: ['Currency'],
  drink_from: ['Drink From'],
  drink_to: ['Drink To'],
  drink_window: ['Drink Window'],
  my_rating: ['My Rating'],
  ratings_blob: ['Ratings', 'Score', 'WA', 'WS', 'WE'],
  my_notes: ['Notes', 'Tasting Notes', 'Comment'],
  upc: ['UPC'],
  barcode: ['Barcode'],
  url: ['URL'],
} as const;

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBestMapping(header: string): MappingTarget | null {
  const normalized = normalizeHeader(header);
  
  for (const [target, synonyms] of Object.entries(RECOGNIZED_HEADERS)) {
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeHeader(synonym);
      if (normalized === normalizedSynonym || normalized.includes(normalizedSynonym)) {
        return target as MappingTarget;
      }
    }
  }
  
  return null;
}

// CellarTracker specific default mapping
export function getCellarTrackerDefaultMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  // CellarTracker standard field mappings
  const cellarTrackerMappings: Record<string, string> = {
    'Barcode': 'barcode',
    'Color': 'color',
    'Currency': 'currency',
    'BeginConsume': 'drink_from',
    'EndConsume': 'drink_to',
    'Notes': 'my_notes',
    'Producer': 'producer',
    'Price': 'typical_price',
    'Vintage': 'vintage',
    'Bin': 'where_stored',
    'Wine': 'wine_name',
  };
  
  // Apply CellarTracker mappings
  headers.forEach(header => {
    const target = cellarTrackerMappings[header];
    if (target) {
      mapping[target] = header;
    }
  });
  
  return mapping;
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  // First try CellarTracker specific mapping
  const cellarTrackerMapping = getCellarTrackerDefaultMapping(headers);
  
  // If we found CellarTracker fields, use that mapping
  if (Object.keys(cellarTrackerMapping).length > 0) {
    return cellarTrackerMapping;
  }
  
  // Otherwise, fall back to generic auto-mapping
  const mapping: ColumnMapping = {};
  
  headers.forEach(header => {
    const target = findBestMapping(header);
    if (target) {
      mapping[target] = header;
    }
  });
  
  return mapping;
}

export function getMappingConfidence(header: string): 'high' | 'medium' | 'low' {
  const normalized = normalizeHeader(header);
  
  // High confidence: exact matches
  for (const synonyms of Object.values(RECOGNIZED_HEADERS)) {
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeHeader(synonym);
      if (normalized === normalizedSynonym) {
        return 'high';
      }
    }
  }
  
  // Medium confidence: partial matches
  for (const synonyms of Object.values(RECOGNIZED_HEADERS)) {
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeHeader(synonym);
      if (normalized.includes(normalizedSynonym) || normalizedSynonym.includes(normalized)) {
        return 'medium';
      }
    }
  }
  
  return 'low';
}

export function suggestMapping(target: MappingTarget): string[] {
  return RECOGNIZED_HEADERS[target] || [];
}
