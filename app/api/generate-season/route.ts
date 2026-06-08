import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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

  const { data: child } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (!child) {
    return NextResponse.json({ error: 'Fant ikke barnet.' }, { status: 404 });
  }

  const { data: bible } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bible) {
    return NextResponse.json(
      { error: 'Story Bible mangler. Generer Story Bible først.' },
      { status: 400 }
    );
  }

  const { data: lastSeason } = await supabaseAdmin
    .from('story_seasons')
    .select('season_number')
    .eq('child_id', childId)
    .order('season_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const seasonNumber = (lastSeason?.season_number || 0) + 1;

  const prompt = `
Lag en sterk sesongplan for en personlig norsk barnebokserie.

Barn:
Navn: ${child.child_name}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Drømmer: ${child.dreams || ''}

Story Bible:
Univers: ${bible.universe_name}
Hovedperson: ${bible.main_character}
Følgesvenn: ${bible.companion_name} (${bible.companion_type})
Eksisterende oppdrag: ${bible.story_goal}
Minne/historikk: ${bible.memory || ''}

Dette er sesong ${seasonNumber}.

VIKTIG:
- 1 sesong = 8 kapitler.
- Serien skal føles som en ekte barnebokserie, ikke tilfeldige enkelthistorier.
- Hvert kapittel må ha tydelig fremdrift.
- Sesongen skal ha ett hovedmål.
- Hvert kapittel skal ha et eget lite mål.
- Kapittel 8 skal være en rolig sesongfinale.
- Trygt, varmt og magisk.
- Ingen skumle eller voldelige ting.
- Bruk følgesvennen aktivt.
- Ikke introduser for mange karakterer.
- Maks 2 nye viktige figurer i hele sesongen.
- Kapitlene skal henge sammen.

Svar KUN som gyldig JSON uten markdown:
{
  "season_theme": "",
  "main_quest": "",
  "season_outline": [
    {
      "chapter_in_season": 1,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 2,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 3,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 4,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 5,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 6,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 7,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    },
    {
      "chapter_in_season": 8,
      "chapter_title": "",
      "chapter_goal": "",
      "key_event": "",
      "ending_hook": ""
    }
  ]
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
            'Du er seriearkitekt for en norsk barnebokserie. Du lager tydelige sesongplaner med varme, magi, fremdrift og gode avslutninger. Du svarer alltid med ren JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.65,
    }),
  });

  const aiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return NextResponse.json(
      { error: `OpenAI-feil: ${JSON.stringify(aiData)}` },
      { status: 500 }
    );
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    return NextResponse.json(
      { error: `OpenAI ga ikke svar: ${JSON.stringify(aiData)}` },
      { status: 500 }
    );
  }

  let season;

  try {
    season = JSON.parse(text);
  } catch {
    return NextResponse.json(
      {
        error: 'Kunne ikke lese AI-svar som JSON.',
        raw: text,
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('story_seasons')
    .insert({
      child_id: childId,
      season_number: seasonNumber,
      season_theme: season.season_theme,
      main_quest: season.main_quest,
      season_outline: season.season_outline,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke lagre sesongplan.', details: error },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from('story_bibles')
    .update({
      story_goal: season.main_quest,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bible.id);

  return NextResponse.json({
    success: true,
    season: data,
  });
}
