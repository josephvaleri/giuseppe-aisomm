import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CommitRequest, CommitResponse } from '@/lib/zod/cellar-import';
import { aggregateRows } from '@/lib/cellar/import/transform';
import { createMinimalWine } from '@/lib/cellar/import/match';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preview, acceptLikelyMatches } = body as CommitRequest;

    if (!preview || !preview.rows) {
      return NextResponse.json({ error: 'Invalid preview data' }, { status: 400 });
    }

    const validRows = preview.rows.filter(row => row.errors.length === 0);
    const errorRows = preview.rows.filter(row => row.errors.length > 0);

    // Resolve wine IDs for all valid rows
    const resolvedRows = [];
    let insertedWines = 0;

    for (const row of validRows) {
      let wineId = row.matched_wine_id;

      if (!wineId) {
        // Create minimal wine for NO_MATCH
        if (row.match_status === 'NO_MATCH' || 
            (row.match_status === 'LIKELY_MATCH' && !acceptLikelyMatches)) {
          try {
            wineId = await createMinimalWine(row, supabase);
            insertedWines++;
          } catch (error) {
            console.error('Error creating wine:', error);
            continue; // Skip this row
          }
        } else if (row.match_status === 'LIKELY_MATCH' && acceptLikelyMatches) {
          // Use the matched wine ID
          wineId = row.matched_wine_id;
        } else {
          continue; // Skip this row
        }
      }

      if (wineId) {
        resolvedRows.push({
          ...row,
          matched_wine_id: wineId,
        });
      }
    }

    // Aggregate rows by wine_id
    const aggregatedRows = aggregateRows(resolvedRows);

    // Execute upserts
    let upsertedItems = 0;
    let totalQuantity = 0;

    for (const [wineId, aggregatedRow] of aggregatedRows) {
      try {
        const { data, error } = await supabase
          .from('cellar_items')
          .upsert({
            user_id: user.id,
            wine_id: wineId,
            quantity: aggregatedRow.quantity,
            where_stored: aggregatedRow.where_stored || null,
            value: aggregatedRow.value || null,
            status: aggregatedRow.status,
            currency: aggregatedRow.currency,
            my_notes: aggregatedRow.my_notes || null,
            my_rating: aggregatedRow.my_rating || null,
            drink_starting: aggregatedRow.drink_starting?.toISOString().split('T')[0] || null,
            drink_by: aggregatedRow.drink_by?.toISOString().split('T')[0] || null,
            typical_price: aggregatedRow.typical_price || null,
            ratings: aggregatedRow.ratings || null,
            color: aggregatedRow.color || null,
            alcohol: aggregatedRow.alcohol || null,
            bottle_size: aggregatedRow.bottle_size || null,
          }, {
            onConflict: 'user_id,wine_id',
            ignoreDuplicates: false,
          })
          .select('bottle_id');

        if (error) {
          console.error('Error upserting cellar item:', error);
          continue;
        }

        upsertedItems++;
        totalQuantity += aggregatedRow.quantity;
      } catch (error) {
        console.error('Error upserting cellar item:', error);
        continue;
      }
    }

    const response: CommitResponse = {
      success: true,
      summary: {
        insertedWines: insertedWines,
        upsertedItems: upsertedItems,
        totalQuantity: totalQuantity,
        skippedRows: resolvedRows.length - aggregatedRows.size,
        errorRows: errorRows.length,
      },
    };

    // If there are error rows, generate error CSV
    if (errorRows.length > 0) {
      // For now, we'll just include the error count in the response
      // In a full implementation, you'd generate and upload the CSV to storage
      response.errorCsvUrl = `/api/cellar/import/errors?rows=${encodeURIComponent(JSON.stringify(errorRows))}`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Commit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
