import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { storyId } = await request.json();

  if (!storyId) {
    return NextResponse.json({ error: 'Mangler storyId.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('stories')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke godkjenne historien.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    story: data,
  });
}
