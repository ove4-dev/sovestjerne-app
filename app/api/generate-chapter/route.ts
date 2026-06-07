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

  const { data: child, error: childError } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Fant ikke barnet.' }, { status: 404 });
  }

  const { data: bible, error: bibleError } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bibleError || !bible) {
    return NextResponse.json({ error: 'Story Bible mangler. Generer Story Bible først.' }, { status: 400 });
  }

  const { data: lastStory } = await supabaseAdmin
    .from('stories')
    .select('chapter_number, summary')
    .eq('child_id', childId)
    .order('chapter_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextChapter = (lastStory?.chapter_number || 0) + 1;

  const prompt = `
Skriv et nytt kapittel i en personlig godnatthistorie-serie.

Barn:
Navn: ${child.child_name}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Ting å unngå: ${child.things_to_avoid || ''}
Drømmer: ${child.dreams || ''}

Story Bible:
Univers: ${bible.universe_name}
Hovedperson: ${bible.main_character}
Følgesvenn: ${bible.companion_name} (${bible.companion_type})
Oppdrag: ${bible.story_goal}
Minne/historikk: ${bible.memory || ''}

Forrige kapittel-oppsummering:
${lastStory?.summary || 'Dette er første kapittel.'}

Dette er kapittel ${nextChapter}.

Regler:
- Skriv på norsk.
- Barnet skal være hovedpersonen.
- Historien skal være varm, magisk og trygg.
- Passer som godnatthistorie.
- Ikke bruk skumle eller voldelige elementer.
- Lengde: ca. 700–1000 ord.
- Avslutt rolig, men med en mild forventning til neste kapittel.

Svar KUN som gyldig JSON uten markdown:
{
  "title": "",
  "summary": "",
  "story_text": ""
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
            'Du er en prisvinnende barnebokforfatter som skriver trygge, magiske godnatthistorier. Du svarer alltid med ren JSON når du blir bedt om det.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
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

  let chapter;

  try {
    chapter = JSON.parse(text);
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
    .from('stories')
    .insert({
      child_id: childId,
      chapter_number: nextChapter,
      title: chapter.title,
      story_text: chapter.story_text,
      summary: chapter.summary,
      status: 'draft',
      generation_status: 'completed',
      email_status: 'not_sent',
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke lagre kapittelet.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    story: data,
  });
}
