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

  const prompt = `
Du lager en Story Bible for et personlig godnatthistorie-univers.

Barn:
Navn: ${child.child_name}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Ting å unngå: ${child.things_to_avoid || ''}
Drømmer: ${child.dreams || ''}

Lag et trygt, varmt og magisk eventyrunivers som kan vare i minst 52 kapitler.

Viktig:
- Barnet skal være hovedpersonen.
- Det skal være varmt, trygt og egnet som godnatthistorie.
- Ikke bruk skumle eller voldelige elementer.
- Lag en tydelig følgesvenn basert på barnets favorittdyr hvis mulig.
- Lag et oppdrag som kan fortsette uke etter uke.

Svar KUN som gyldig JSON uten markdown:
{
  "universe_name": "",
  "main_character": "",
  "companion_name": "",
  "companion_type": "",
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
          content: 'Du er en ekspert på trygge, magiske godnatthistorier for barn. Du svarer alltid med ren JSON når du blir bedt om det.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
    }),
  });

  const aiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return NextResponse.json(
      {
        error: 'OpenAI-feil',
        details: aiData,
      },
      { status: 500 }
    );
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    return NextResponse.json(
      {
        error: 'OpenAI ga ikke svar.',
        details: aiData,
      },
      { status: 500 }
    );
  }

  let bible;

  try {
    bible = JSON.parse(text);
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
    .from('story_bibles')
    .insert({
      child_id: childId,
      universe_name: bible.universe_name,
      main_character: bible.main_character,
      companion_name: bible.companion_name,
      companion_type: bible.companion_type,
      story_goal: bible.story_goal,
      current_chapter: 1,
      memory: bible.memory,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: 'Kunne ikke lagre Story Bible.',
        details: error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    storyBible: data,
  });
}
