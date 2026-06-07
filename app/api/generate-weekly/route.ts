import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

async function generateChapterForChild(childId: string) {
  const { data: child, error: childError } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    return { childId, success: false, error: 'Fant ikke barnet.' };
  }

  if (child.subscription_status !== 'active') {
    return {
      childId,
      childName: child.child_name,
      success: false,
      skipped: true,
      error: 'Abonnement ikke aktivt.',
    };
  }

  const now = new Date();

  if (child.next_chapter_date && new Date(child.next_chapter_date) > now) {
    return {
      childId,
      childName: child.child_name,
      success: false,
      skipped: true,
      error: 'Ikke tid for neste kapittel ennå.',
    };
  }

  const { data: bible, error: bibleError } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bibleError || !bible) {
    return {
      childId,
      childName: child.child_name,
      success: false,
      error: 'Story Bible mangler.',
    };
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
    return {
      childId,
      childName: child.child_name,
      success: false,
      error: `OpenAI-feil: ${JSON.stringify(aiData)}`,
    };
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    return {
      childId,
      childName: child.child_name,
      success: false,
      error: `OpenAI ga ikke svar: ${JSON.stringify(aiData)}`,
    };
  }

  let chapter;

  try {
    chapter = JSON.parse(text);
  } catch {
    return {
      childId,
      childName: child.child_name,
      success: false,
      error: 'Kunne ikke lese AI-svar som JSON.',
      raw: text,
    };
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
    return {
      childId,
      childName: child.child_name,
      success: false,
      error: 'Kunne ikke lagre kapittelet.',
      details: error,
    };
  }

  const nextChapterDate = new Date();
  nextChapterDate.setDate(nextChapterDate.getDate() + 7);

  await supabaseAdmin
    .from('children')
    .update({
      last_chapter_sent_at: new Date().toISOString(),
      next_chapter_date: nextChapterDate.toISOString(),
    })
    .eq('id', childId);

  return {
    childId,
    childName: child.child_name,
    success: true,
    storyId: data.id,
    chapterNumber: nextChapter,
    title: data.title,
    nextChapterDate: nextChapterDate.toISOString(),
  };
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { data: children, error } = await supabaseAdmin
    .from('children')
    .select('id, child_name')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke hente barn.', details: error },
      { status: 500 }
    );
  }

  const results = [];

  for (const child of children || []) {
    const result = await generateChapterForChild(child.id);
    results.push(result);
  }

  const generated = results.filter((r) => r.success).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.success && !r.skipped).length;

  return NextResponse.json({
    success: true,
    generated,
    skipped,
    failed,
    results,
  });
}
