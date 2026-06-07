import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('children')
    .select('id, created_at, parent_email, child_name, child_age, favorite_animal, favorite_color, interests, story_bibles(universe_name, companion_name, current_chapter)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Kunne ikke hente data.' }, { status: 500 });
  }

  return NextResponse.json({ children: data });
}
