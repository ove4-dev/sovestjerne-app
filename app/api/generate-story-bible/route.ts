import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function fallbackCompanionName(favoriteAnimal?: string | null) {
  const animal = (favoriteAnimal || '').toLowerCase();

  if (animal.includes('hund')) return 'Turbo';
  if (animal.includes('katt')) return 'Milo';
  if (animal.includes('hest')) return 'Luna';
  if (animal.includes('delfin')) return 'Delfi';
  if (animal.includes('dinosaur')) return 'Dino';
  if (animal.includes('papegøye')) return 'Pico';
  if (animal.includes('rev')) return 'Foxy';
  if (animal.includes('kanin')) return 'Ninni';

  return 'Stella';
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { childId } = await request.json();

  if (!childId) {
    return NextResponse.json({ error: 'Mangler childId.' }, { status: 400 });
  }

  const { data: child, error: childError } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Fant ikke barnet.' }, { status: 404 });
  }

  const { count } = await supabaseAdmin
    .from('stories')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId);

  if ((count || 0) > 0) {
    return NextResponse.json(
      {
        error:
          'Story Bible er låst fordi barnet allerede har kapitler. Slett kapitlene først hvis du vil lage ny Story Bible.',
      },
      { status: 400 }
    );
  }

  const childName = child.child_name;

  const prompt = `
Du lager en Story Bible for en personlig norsk barnebokserie.

KRITISK NAVNELÅS:
- Barnets navn er: ${childName}
- Hovedpersonen SKAL alltid hete: ${childName}
- Du har IKKE lov til å finne på et annet navn til hovedpersonen.
- main_character må være nøyaktig: "${childName}"
- Følgesvennen må ha et annet navn enn ${childName}.
- Følgesvennen må ikke hete det samme som hovedpersonen.
- Hvis favorittdyret er hund, kan følgesvennen gjerne være en hund, men navnet må ikke være ${childName}.

Barn:
Navn: ${child.child_name}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Favorittsted: ${child.favorite_place || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Drømmer: ${child.dreams || ''}
Ting å unngå: ${child.things_to_avoid || ''}

Lag en varm, trygg, magisk og personlig serieverden.

VIKTIG:
- Serien skal kunne vare i mange kapitler.
- Det skal finnes et tydelig langtidsmysterium eller hovedoppdrag.
- Følgesvennen skal være en ekte karakter med personlighet, styrker, svakheter, hobby og et lite favorittuttrykk.
- Følgesvennen skal kunne bidra aktivt i handlingen.
- Universet skal passe barnets interesser.
- Ikke lag skumle, mørke eller voldelige elementer.
- Ikke bruk våpen, krig, monstre, demoner eller skrekk.

Svar KUN som gyldig JSON uten markdown:
{
  "universe_name": "",
  "main_character": "${childName}",
  "companion_name": "",
  "companion_type": "",
  "companion_personality": "",
  "companion_power": "",
  "companion_weakness": "",
  "companion_hobby": "",
  "companion_phrase": "",
  "story_goal": "",
  "memory": ""
}
`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Du lager Story Bible for norske barnebokserier. Du følger navnelås strengt. Du svarer alltid med ren JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.35,
      response_format: { type: 'json_object' },
    }),
  });

  const aiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return NextResponse.json(
      { error: 'OpenAI-feil.', details: aiData },
      { status: 500 }
    );
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    return NextResponse.json(
      { error: 'OpenAI ga ikke svar.', details: aiData },
      { status: 500 }
    );
  }

  let bible;

  try {
    bible = JSON.parse(cleanJson(text));
  } catch {
    return NextResponse.json(
      {
        error: 'Kunne ikke lese Story Bible som JSON.',
        raw: text,
      },
      { status: 500 }
    );
  }

  bible.main_character = childName;

  if (
    !bible.companion_name ||
    String(bible.companion_name).trim().toLowerCase() === childName.toLowerCase()
  ) {
    bible.companion_name = fallbackCompanionName(child.favorite_animal);
  }

  if (!bible.companion_type) {
    bible.companion_type = child.favorite_animal || 'magisk følgesvenn';
  }

  const { data, error } = await supabaseAdmin
    .from('story_bibles')
    .insert({
      child_id: childId,
      universe_name: bible.universe_name || `${childName}s eventyrverden`,
      main_character: childName,
      companion_name: bible.companion_name,
      companion_type: bible.companion_type,
      companion_personality: bible.companion_personality || '',
      companion_power: bible.companion_power || '',
      companion_weakness: bible.companion_weakness || '',
      companion_hobby: bible.companion_hobby || '',
      companion_phrase: bible.companion_phrase || '',
      story_goal: bible.story_goal || '',
      current_chapter: 0,
      memory: bible.memory || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke lagre Story Bible.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    bible: data,
  });
}
