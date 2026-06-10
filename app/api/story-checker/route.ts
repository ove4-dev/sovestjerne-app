import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { prompt, chapter } = await request.json();

  if (!chapter?.story_text) {
    return NextResponse.json(
      { error: 'Mangler chapter.story_text.' },
      { status: 400 }
    );
  }

  const checkerPrompt = `
Du er redaktør for en norsk barnebokserie.

Vurder kapittelet strengt.

Gi score 1-10 på:
- character_depth
- companion_use
- mystery_quality
- dialogue_quality
- variation
- continuity
- bedtime_feel

VIKTIG:
- Følgesvennen må påvirke handlingen.
- Nye karakterer skal ikke løse alt.
- Mysteriet skal ikke løses for raskt.
- Dialogen skal ikke bare være "ja", "la oss", "så spennende".
- Åpning og avslutning må ikke føles generisk.
- Kapittelet skal føles som en ekte barnebok, ikke AI-tekst.

Hvis total_score er under 8, gi konkrete rewrite_instructions.

Original prompt:
${prompt || ''}

Kapittel:
Tittel: ${chapter.title || ''}
Oppsummering: ${chapter.summary || ''}
Tekst:
${chapter.story_text}

Svar KUN som gyldig JSON:
{
  "total_score": 0,
  "character_depth": 0,
  "companion_use": 0,
  "mystery_quality": 0,
  "dialogue_quality": 0,
  "variation": 0,
  "continuity": 0,
  "bedtime_feel": 0,
  "should_rewrite": true,
  "rewrite_instructions": ""
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
            'Du er en streng, men hjelpsom redaktør for norske barnebøker. Du svarer alltid med ren JSON.',
        },
        {
          role: 'user',
          content: checkerPrompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  const aiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    return NextResponse.json(
      { error: 'OpenAI-feil i story-checker.', details: aiData },
      { status: 500 }
    );
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    return NextResponse.json(
      { error: 'Story checker ga ikke svar.', details: aiData },
      { status: 500 }
    );
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    return NextResponse.json(
      {
        error: 'Kunne ikke lese checker-svar som JSON.',
        raw: text,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    result,
  });
}
