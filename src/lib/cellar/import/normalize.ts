import { ParsedRow } from '@/lib/zod/cellar-import';

export function normalizeStatus(status: string | undefined): 'stored' | 'drank' | 'lost' {
  if (!status) return 'stored';
  
  const normalized = status.toLowerCase().trim();
  
  if (normalized.includes('consumed') || normalized.includes('drank') || normalized.includes('drunk')) {
    return 'drank';
  }
  
  if (normalized.includes('missing') || normalized.includes('lost') || normalized.includes('gone')) {
    return 'lost';
  }
  
  return 'stored';
}

export function normalizeRating(rating: number | string | undefined): number | undefined {
  if (!rating) return undefined;
  
  // Handle string ratings like "★★★☆☆"
  if (typeof rating === 'string') {
    const starCount = (rating.match(/★/g) || []).length;
    if (starCount > 0) {
      return Math.min(Math.max(starCount, 1), 5);
    }
    
    // Try to parse as number
    const num = parseFloat(rating);
    if (!isNaN(num)) {
      rating = num;
    } else {
      return undefined;
    }
  }
  
  const numRating = Number(rating);
  if (isNaN(numRating)) return undefined;
  
  // If 50-100 scale, convert to 1-5
  if (numRating >= 50 && numRating <= 100) {
    return Math.round(Math.max(Math.min(numRating / 20, 5), 1));
  }
  
  // If already 1-5, use as-is
  if (numRating >= 1 && numRating <= 5) {
    return Math.round(numRating);
  }
  
  return undefined;
}

export function normalizeAlcohol(alcohol: number | string | undefined): number | undefined {
  if (!alcohol) return undefined;
  
  let num: number;
  
  if (typeof alcohol === 'string') {
    // Remove % symbol and parse
    const cleaned = alcohol.replace('%', '').trim();
    num = parseFloat(cleaned);
  } else {
    num = alcohol;
  }
  
  if (isNaN(num)) return undefined;
  
  // Clamp between 0-30%
  return Math.max(Math.min(num, 30), 0);
}

export function normalizeDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  
  const cleaned = dateStr.trim();
  
  // Try different date formats
  const formats = [
    /^\d{4}$/, // YYYY
    /^\d{4}-\d{2}$/, // YYYY-MM
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  ];
  
  let date: Date;
  
  if (formats[0].test(cleaned)) {
    // YYYY - use January 1st
    date = new Date(`${cleaned}-01-01`);
  } else if (formats[1].test(cleaned)) {
    // YYYY-MM - use first day of month
    date = new Date(`${cleaned}-01`);
  } else {
    // Try parsing as-is
    date = new Date(cleaned);
  }
  
  if (isNaN(date.getTime())) return undefined;
  
  return date;
}

export function normalizeWhereStored(location?: string, bin?: string): string | undefined {
  const parts = [location, bin].filter(Boolean).map(s => s?.trim()).filter(Boolean);
  
  if (parts.length === 0) return undefined;
  
  return parts.join(' — ');
}

export function normalizeRatings(ratings: string | undefined): string | undefined {
  if (!ratings) return undefined;
  
  // Extract rating patterns like "WA 94", "WS 92", "WE 93"
  const patterns = [
    /\bWA\s+(\d+)/gi,
    /\bWS\s+(\d+)/gi,
    /\bWE\s+(\d+)/gi,
    /\bRP\s+(\d+)/gi,
    /\bJH\s+(\d+)/gi,
  ];
  
  const found = new Set<string>();
  
  patterns.forEach(pattern => {
    const matches = ratings.match(pattern);
    if (matches) {
      matches.forEach(match => found.add(match.trim()));
    }
  });
  
  if (found.size === 0) return ratings.trim();
  
  return Array.from(found).join('; ');
}

export function normalizeRow(row: any, rowIndex: number): ParsedRow {
  return {
    __rowIndex: rowIndex,
    wine_name: row.wine_name?.trim() || undefined,
    producer: row.producer?.trim() || undefined,
    vintage: row.vintage,
    quantity: row.quantity || 1,
    where_stored: normalizeWhereStored(row.where_stored, row.bin),
    value: row.value,
    currency: row.currency?.trim() || 'USD',
    status: normalizeStatus(row.status),
    my_notes: row.my_notes?.trim() || undefined,
    my_rating: normalizeRating(row.my_rating),
    drink_from: row.drink_from?.trim() || undefined,
    drink_to: row.drink_to?.trim() || undefined,
    typical_price: row.typical_price,
    ratings_blob: normalizeRatings(row.ratings_blob),
    color: row.color?.trim() || undefined,
    alcohol: normalizeAlcohol(row.alcohol),
    bottle_size: row.bottle_size?.trim() || undefined,
    upc: row.upc?.trim() || undefined,
    barcode: row.barcode?.trim() || undefined,
    url: row.url?.trim() || undefined,
  };
}

export function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  
  // At least wine_name or (producer & vintage) required
  if (!row.wine_name && (!row.producer || !row.vintage)) {
    errors.push('Either wine name or both producer and vintage are required');
  }
  
  // Validate quantity
  if (row.quantity < 0) {
    errors.push('Quantity must be non-negative');
  }
  
  // Validate rating range
  if (row.my_rating !== undefined && (row.my_rating < 1 || row.my_rating > 5)) {
    errors.push('Rating must be between 1 and 5');
  }
  
  // Validate alcohol percentage
  if (row.alcohol !== undefined && (row.alcohol < 0 || row.alcohol > 30)) {
    errors.push('Alcohol percentage must be between 0 and 30');
  }
  
  return errors;
}
