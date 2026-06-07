import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('children')
    .select(`
      id,
      created_at,
      parent_email,
      child_name,
      child_age,
      favorite_animal,
      favorite_color,
      favorite_place,
      interests,
      personality,
      things_to_avoid,
      dreams,
      story_bibles (
        universe_name,
        companion_name,
        companion_type,
        story_goal,
        current_chapter,
        memory
      ),
      stories (
        id,
        created_at,
        chapter_number,
        title,
        story_text,
        summary,
        status,
        email_status,
        sent_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke hente data.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ children: data });
}
