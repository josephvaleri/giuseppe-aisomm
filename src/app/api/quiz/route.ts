import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const study = url.searchParams.get('study_area') ?? 'Grapes';
    const type = url.searchParams.get('type') ?? 'pop';
    const limit = type === 'pop' ? 5 : 10;
    const usedQuestions = url.searchParams.get('used_questions') ?? '';
    
    // Parse used question IDs to avoid duplicates
    const usedQuestionIds = usedQuestions ? usedQuestions.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    // Use service client for API routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Build query with exclusion of used questions
    let query = supabase
      .from('wine_quiz')
      .select('*')
      .eq('study_area', study);
    
    // Exclude already used questions if any
    if (usedQuestionIds.length > 0) {
      query = query.not('question_id', 'in', `(${usedQuestionIds.join(',')})`);
    }
    
    const { data, error } = await query
      .order('upvotes', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
