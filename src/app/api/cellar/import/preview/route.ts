import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ColumnMapping, ParsedRow, PreviewRow, PreviewResponse } from '@/lib/zod/cellar-import';
import { normalizeRow, validateRow } from '@/lib/cellar/import/normalize';
import { matchWine, createMinimalWine } from '@/lib/cellar/import/match';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData, mapping } = body as {
      csvData: any[];
      mapping: ColumnMapping;
    };

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: 'Invalid CSV data' }, { status: 400 });
    }

    if (!mapping || typeof mapping !== 'object') {
      return NextResponse.json({ error: 'Invalid mapping' }, { status: 400 });
    }

    const previewRows: PreviewRow[] = [];
    let totalRows = 0;
    let validRows = 0;
    let errorRows = 0;
    let exactMatches = 0;
    let likelyMatches = 0;
    let noMatches = 0;

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const rawRow = csvData[i];
      totalRows++;

      // Apply mapping
      const mappedRow: any = { __rowIndex: i };
      
      Object.entries(mapping).forEach(([target, csvColumn]) => {
        if (csvColumn && rawRow[csvColumn] !== undefined) {
          mappedRow[target] = rawRow[csvColumn];
        }
      });

      // Normalize the row
      const normalizedRow = normalizeRow(mappedRow, i);
      
      // Validate the row
      const errors = validateRow(normalizedRow);
      
      if (errors.length > 0) {
        previewRows.push({
          ...normalizedRow,
          match_status: 'NO_MATCH',
          errors,
        });
        errorRows++;
        continue;
      }

      validRows++;

      // Try to match the wine
      let matchResult;
      try {
        matchResult = await matchWine(normalizedRow);
      } catch (error) {
        console.error('Error matching wine:', error);
        matchResult = { status: 'NO_MATCH' as const };
      }

      // Update match statistics
      if (matchResult.status === 'EXACT_MATCH') {
        exactMatches++;
      } else if (matchResult.status === 'LIKELY_MATCH') {
        likelyMatches++;
      } else {
        noMatches++;
      }

      previewRows.push({
        ...normalizedRow,
        match_status: matchResult.status,
        match_score: matchResult.score,
        matched_wine_id: matchResult.wine_id,
        errors: [],
      });
    }

    const response: PreviewResponse = {
      stats: {
        total: totalRows,
        valid: validRows,
        errors: errorRows,
        exactMatches,
        likelyMatches,
        noMatches,
      },
      rows: previewRows,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
