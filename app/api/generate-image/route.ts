import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json(
      { error: 'Ikke tilgang.' },
      { status: 401 }
    );
  }

  const { storyId } = await request.json();

  if (!storyId) {
    return NextResponse.json(
      { error: 'Mangler storyId.' },
      { status: 400 }
    );
  }

  const { data: story } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (!story) {
    return NextResponse.json(
      { error: 'Fant ikke historien.' },
      { status: 404 }
    );
  }

  const { data: child } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', story.child_id)
    .single();

  if (!child) {
    return NextResponse.json(
      { error: 'Fant ikke barnet.' },
      { status: 404 }
    );
  }

  const { data: bible } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', child.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bible) {
    return NextResponse.json(
      { error: 'Fant ikke Story Bible.' },
      { status: 404 }
    );
  }

  const prompt = `
Barnebokillustrasjon.

Univers:
${bible.universe_name}

Følgesvenn:
${bible.companion_name}
(${bible.companion_type})

Favorittfarge:
${child.favorite_color || 'blå'}

Kapittel:
${story.title}

Oppsummering:
${story.summary}

Regler:
- Varm nordisk barnebokstil
- Myke farger
- Magisk stemning
- Trygg for barn
- Ikke skummelt
- Høy kvalitet
- Fokus på følgesvennen
- Favorittfargen skal brukes som detaljfarge
`;

  const { data: existing } = await supabaseAdmin
    .from('story_images')
    .select('id')
    .eq('story_id', story.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('story_images')
      .update({
        prompt,
        generation_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return NextResponse.json({
      success: true,
      updated: true,
      prompt,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('story_images')
    .insert({
      story_id: story.id,
      prompt,
      status: 'draft',
      generation_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: 'Kunne ikke lagre bildeoppføring.',
        details: error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    image: data,
    prompt,
  });
}
