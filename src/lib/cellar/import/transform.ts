import { PreviewRow } from '@/lib/zod/cellar-import';

export interface AggregatedRow {
  wine_id: number;
  quantity: number;
  where_stored?: string;
  value?: number;
  currency: string;
  status: 'stored' | 'drank' | 'lost';
  my_notes?: string;
  my_rating?: number;
  drink_starting?: Date;
  drink_by?: Date;
  typical_price?: number;
  ratings?: string;
  color?: string;
  alcohol?: number;
  bottle_size?: string;
  rowCount: number;
}

export function aggregateRows(rows: PreviewRow[]): Map<number, AggregatedRow> {
  const grouped = new Map<number, PreviewRow[]>();
  
  // Group rows by wine_id
  rows.forEach(row => {
    if (row.matched_wine_id) {
      if (!grouped.has(row.matched_wine_id)) {
        grouped.set(row.matched_wine_id, []);
      }
      grouped.get(row.matched_wine_id)!.push(row);
    }
  });
  
  const aggregated = new Map<number, AggregatedRow>();
  
  grouped.forEach((rows, wine_id) => {
    const aggregatedRow: AggregatedRow = {
      wine_id,
      quantity: 0,
      currency: 'USD',
      status: 'stored',
      rowCount: rows.length,
    };
    
    // Sum quantity
    aggregatedRow.quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    
    // Choose where_stored by "most frequent non-empty"
    const whereStoredCounts = new Map<string, number>();
    rows.forEach(row => {
      if (row.where_stored) {
        whereStoredCounts.set(row.where_stored, (whereStoredCounts.get(row.where_stored) || 0) + 1);
      }
    });
    
    if (whereStoredCounts.size > 0) {
      const mostFrequent = Array.from(whereStoredCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      aggregatedRow.where_stored = mostFrequent;
    }
    
    // Keep most recent non-null values (per row order)
    const nonNullValues = rows.filter(row => row.value !== undefined && row.value !== null);
    if (nonNullValues.length > 0) {
      aggregatedRow.value = nonNullValues[nonNullValues.length - 1].value;
    }
    
    const nonNullTypicalPrices = rows.filter(row => row.typical_price !== undefined && row.typical_price !== null);
    if (nonNullTypicalPrices.length > 0) {
      aggregatedRow.typical_price = nonNullTypicalPrices[nonNullTypicalPrices.length - 1].typical_price;
    }
    
    const nonNullCurrencies = rows.filter(row => row.currency);
    if (nonNullCurrencies.length > 0) {
      aggregatedRow.currency = nonNullCurrencies[nonNullCurrencies.length - 1].currency!;
    }
    
    const nonNullColors = rows.filter(row => row.color);
    if (nonNullColors.length > 0) {
      aggregatedRow.color = nonNullColors[nonNullColors.length - 1].color!;
    }
    
    const nonNullAlcohols = rows.filter(row => row.alcohol !== undefined && row.alcohol !== null);
    if (nonNullAlcohols.length > 0) {
      aggregatedRow.alcohol = nonNullAlcohols[nonNullAlcohols.length - 1].alcohol;
    }
    
    const nonNullBottleSizes = rows.filter(row => row.bottle_size);
    if (nonNullBottleSizes.length > 0) {
      aggregatedRow.bottle_size = nonNullBottleSizes[nonNullBottleSizes.length - 1].bottle_size!;
    }
    
    // Concatenate my_notes (up to 1000 chars)
    const notes = rows
      .filter(row => row.my_notes)
      .map(row => row.my_notes!)
      .filter((note, index, arr) => arr.indexOf(note) === index); // dedupe
    
    if (notes.length > 0) {
      const combinedNotes = notes.join('\n—\n');
      aggregatedRow.my_notes = combinedNotes.substring(0, 1000);
    }
    
    // Use max rating (user's best rating)
    const ratings = rows
      .filter(row => row.my_rating !== undefined && row.my_rating !== null)
      .map(row => row.my_rating!);
    
    if (ratings.length > 0) {
      aggregatedRow.my_rating = Math.max(...ratings);
    }
    
    // Choose min drink_starting and max drink_by
    const drinkStartings = rows
      .filter(row => row.drink_from)
      .map(row => new Date(row.drink_from!))
      .filter(date => !isNaN(date.getTime()));
    
    if (drinkStartings.length > 0) {
      aggregatedRow.drink_starting = new Date(Math.min(...drinkStartings.map(d => d.getTime())));
    }
    
    const drinkBys = rows
      .filter(row => row.drink_to)
      .map(row => new Date(row.drink_to!))
      .filter(date => !isNaN(date.getTime()));
    
    if (drinkBys.length > 0) {
      aggregatedRow.drink_by = new Date(Math.max(...drinkBys.map(d => d.getTime())));
    }
    
    // Merge ratings (deduped)
    const ratingStrings = rows
      .filter(row => row.ratings_blob)
      .map(row => row.ratings_blob!);
    
    if (ratingStrings.length > 0) {
      const allRatings = ratingStrings.join('; ');
      const dedupedRatings = Array.from(new Set(allRatings.split('; '))).join('; ');
      aggregatedRow.ratings = dedupedRatings.substring(0, 1000);
    }
    
    // Status priority: stored > drank > lost
    const statuses = rows.map(row => row.status);
    if (statuses.includes('stored')) {
      aggregatedRow.status = 'stored';
    } else if (statuses.includes('drank')) {
      aggregatedRow.status = 'drank';
    } else {
      aggregatedRow.status = 'lost';
    }
    
    aggregated.set(wine_id, aggregatedRow);
  });
  
  return aggregated;
}

export function generateUpsertSQL(aggregatedRows: Map<number, AggregatedRow>): string {
  const values: string[] = [];
  
  aggregatedRows.forEach(row => {
    const valueRow = `(
      $1, -- user_id
      ${row.wine_id}, -- wine_id
      ${row.quantity}, -- quantity
      ${row.where_stored ? `'${row.where_stored.replace(/'/g, "''")}'` : 'NULL'}, -- where_stored
      ${row.value || 'NULL'}, -- value
      '${row.status}', -- status
      '${row.currency}', -- currency
      ${row.my_notes ? `'${row.my_notes.replace(/'/g, "''")}'` : 'NULL'}, -- my_notes
      ${row.my_rating || 'NULL'}, -- my_rating
      ${row.drink_starting ? `'${row.drink_starting.toISOString().split('T')[0]}'` : 'NULL'}, -- drink_starting
      ${row.drink_by ? `'${row.drink_by.toISOString().split('T')[0]}'` : 'NULL'}, -- drink_by
      ${row.typical_price || 'NULL'}, -- typical_price
      ${row.ratings ? `'${row.ratings.replace(/'/g, "''")}'` : 'NULL'}, -- ratings
      ${row.color ? `'${row.color.replace(/'/g, "''")}'` : 'NULL'}, -- color
      ${row.alcohol || 'NULL'}, -- alcohol
      ${row.bottle_size ? `'${row.bottle_size.replace(/'/g, "''")}'` : 'NULL'} -- bottle_size
    )`;
    values.push(valueRow);
  });
  
  return `
    INSERT INTO public.cellar_items AS c (
      user_id, wine_id, quantity, where_stored, value, status, currency,
      my_notes, my_rating, drink_starting, drink_by, typical_price, ratings,
      color, alcohol, bottle_size
    )
    VALUES ${values.join(',\n')}
    ON CONFLICT (user_id, wine_id) DO UPDATE
      SET quantity = c.quantity + excluded.quantity,
          where_stored = COALESCE(excluded.where_stored, c.where_stored),
          value = COALESCE(excluded.value, c.value),
          status = CASE WHEN c.status = 'stored' THEN c.status ELSE excluded.status END,
          currency = COALESCE(excluded.currency, c.currency),
          my_notes = CASE
            WHEN c.my_notes IS NULL THEN excluded.my_notes
            WHEN excluded.my_notes IS NULL THEN c.my_notes
            ELSE SUBSTRING(c.my_notes || E'\\n—\\n' || excluded.my_notes FROM 1 FOR 1000)
          END,
          my_rating = GREATEST(COALESCE(c.my_rating,1), COALESCE(excluded.my_rating,1)),
          drink_starting = LEAST(COALESCE(c.drink_starting, excluded.drink_starting), COALESCE(excluded.drink_starting, c.drink_starting)),
          drink_by = GREATEST(COALESCE(c.drink_by, excluded.drink_by), COALESCE(excluded.drink_by, c.drink_by)),
          typical_price = COALESCE(excluded.typical_price, c.typical_price),
          ratings = CASE
            WHEN c.ratings IS NULL THEN excluded.ratings
            WHEN excluded.ratings IS NULL THEN c.ratings
            ELSE SUBSTRING(c.ratings || '; ' || excluded.ratings FROM 1 FOR 1000)
          END,
          color = COALESCE(excluded.color, c.color),
          alcohol = COALESCE(excluded.alcohol, c.alcohol),
          bottle_size = COALESCE(excluded.bottle_size, c.bottle_size)
    RETURNING bottle_id;
  `;
}
