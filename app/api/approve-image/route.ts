import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { imageId } = await request.json();

  if (!imageId) {
    return NextResponse.json({ error: 'Mangler imageId.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('story_images')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', imageId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke godkjenne bilde.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    image: data,
  });
}
