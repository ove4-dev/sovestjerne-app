import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/parent_email=([^;]+)/);
  const email = match ? decodeURIComponent(match[1]).toLowerCase() : '';

  if (!email) {
    return NextResponse.json({ error: 'Ikke innlogget.' }, { status: 401 });
  }

  const { data: parent } = await supabaseAdmin
    .from('parents')
    .select('id, email, name, subscription_status')
    .eq('email', email)
    .single();

  if (!parent) {
    return NextResponse.json({ error: 'Fant ikke forelder.' }, { status: 404 });
  }

  const { data: children, error } = await supabaseAdmin
    .from('children')
    .select(`
      id,
      child_name,
      next_chapter_date,
      subscription_status,
      stories (
        id,
        chapter_number,
        title,
        summary,
        status,
        email_status,
        sent_at,
        created_at
      )
    `)
    .eq('parent_id', parent.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Kunne ikke hente data.' }, { status: 500 });
  }

  return NextResponse.json({
    parent,
    children,
  });
}
