import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

function cleanFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

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

  const { data: story } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (!story) {
    return NextResponse.json({ error: 'Fant ikke historien.' }, { status: 404 });
  }

  const { data: child } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', story.child_id)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Fant ikke barnet.' }, { status: 404 });
  }

  const { data: bible } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', child.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bible) {
    return NextResponse.json({ error: 'Fant ikke Story Bible.' }, { status: 404 });
  }

  const prompt = `
Lag en varm, trygg og magisk barnebokillustrasjon.

Viktig:
- Ikke lag et realistisk bilde.
- Ikke lag et portrett av barnet.
- Fokus skal være på følgesvennen og eventyrverdenen.
- Ingen tekst i bildet.
- Ingen skumle elementer.

Fast visuell identitet:
Univers: ${bible.universe_name}
Følgesvenn: ${bible.companion_name}, en vennlig ${bible.companion_type}
Favorittfarge: ${child.favorite_color || 'blå'}
Stil: premium nordisk barnebokillustrasjon, myke farger, rolig godnatthistorie-stemning.

Kapittel:
${story.title || 'Nytt kapittel'}

Scene fra kapittelet:
${story.summary || 'Følgesvennen oppdager noe magisk i eventyrverdenen.'}

Bruk favorittfargen som magiske detaljer, for eksempel skjerf, stjernestøv, lys eller små krystaller.
Bildet skal føles som en illustrasjon fra en vakker barnebokserie.
`;

  const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    }),
  });

  const imageData = await imageResponse.json();

  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: `OpenAI bilde-feil: ${JSON.stringify(imageData)}` },
      { status: 500 }
    );
  }

  const base64Image = imageData.data?.[0]?.b64_json;

  if (!base64Image) {
    return NextResponse.json(
      { error: `OpenAI returnerte ikke bilde: ${JSON.stringify(imageData)}` },
      { status: 500 }
    );
  }

  const imageBuffer = Buffer.from(base64Image, 'base64');

  const filename = `${cleanFilename(story.id)}-${Date.now()}.png`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('story-images')
    .upload(filename, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'Kunne ikke laste opp bilde.', details: uploadError },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('story-images')
    .getPublicUrl(filename);

  const imageUrl = publicUrlData.publicUrl;

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
        image_url: imageUrl,
        status: 'draft',
        generation_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return NextResponse.json({
      success: true,
      updated: true,
      image_url: imageUrl,
      prompt,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('story_images')
    .insert({
      story_id: story.id,
      prompt,
      image_url: imageUrl,
      status: 'draft',
      generation_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke lagre bildeoppføring.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    image: data,
    image_url: imageUrl,
    prompt,
  });
}
