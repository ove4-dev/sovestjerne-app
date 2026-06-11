import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createStoryStyle } from '../../../lib/story-style-engine';
import { getStoryStyleBank } from '../../../lib/story-style-bank';

type SeasonEpisode = {
  chapter_in_season: number;
  chapter_title?: string;
  chapter_goal?: string;
  key_event?: string;
  ending_hook?: string;
};

type ChapterResult = {
  title: string;
  summary: string;
  story_text: string;
  continuity_update: string;
  state_update?: {
    active_goal?: string;
    completed_goals?: string[];
    found_items?: string[];
    known_places?: string[];
    known_characters?: string[];
    open_mysteries?: string[];
  };
  character_updates?: Array<{
    name?: string;
    role?: string;
    personality?: string;
    description?: string;
    fear?: string;
    dream?: string;
    secret?: string;
    favorite_thing?: string;
    habit?: string;
  }>;
};

type CheckerResult = {
  total_score: number;
  character_depth: number;
  companion_use: number;
  mystery_quality: number;
  dialogue_quality: number;
  variation: number;
  continuity: number;
  bedtime_feel: number;
  should_rewrite: boolean;
  rewrite_instructions: string;
};

function asArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function mergeUnique(oldItems: unknown, newItems: unknown): string[] {
  const combined = [...asArray(oldItems), ...asArray(newItems)];
  return Array.from(new Set(combined.map((item) => item.trim()).filter(Boolean)));
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeChapter(value: unknown): ChapterResult {
  const item = value as Partial<ChapterResult>;

  return {
    title: String(item?.title || ''),
    summary: String(item?.summary || ''),
    story_text: String(item?.story_text || ''),
    continuity_update: String(item?.continuity_update || item?.summary || ''),
    state_update:
      item?.state_update && typeof item.state_update === 'object'
        ? item.state_update
        : {},
    character_updates: Array.isArray(item?.character_updates)
      ? item.character_updates
      : [],
  };
}

function normalizeChecker(value: unknown): CheckerResult {
  const item = value as Partial<CheckerResult>;
  const total = Number(item?.total_score || 0);

  return {
    total_score: total,
    character_depth: Number(item?.character_depth || 0),
    companion_use: Number(item?.companion_use || 0),
    mystery_quality: Number(item?.mystery_quality || 0),
    dialogue_quality: Number(item?.dialogue_quality || 0),
    variation: Number(item?.variation || 0),
    continuity: Number(item?.continuity || 0),
    bedtime_feel: Number(item?.bedtime_feel || 0),
    should_rewrite: Boolean(item?.should_rewrite) || total < 8,
    rewrite_instructions: String(item?.rewrite_instructions || ''),
  };
}

function fixNames(chapter: ChapterResult, childName: string, companionName: string) {
  const wrongCompanionNames = ['Bobby', 'Milo', 'Nova', 'Rufus'];

  for (const wrongName of wrongCompanionNames) {
    if (
      wrongName.toLowerCase() === childName.toLowerCase() ||
      wrongName.toLowerCase() === companionName.toLowerCase()
    ) {
      continue;
    }

    chapter.story_text = chapter.story_text.replaceAll(wrongName, companionName);
    chapter.summary = chapter.summary.replaceAll(wrongName, companionName);
    chapter.title = chapter.title.replaceAll(wrongName, companionName);
    chapter.continuity_update = chapter.continuity_update.replaceAll(
      wrongName,
      companionName
    );
  }

  return chapter;
}

async function callOpenAiJson<T>({
  system,
  user,
  temperature,
}: {
  system: string;
  user: string;
  temperature: number;
}): Promise<T> {
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  const aiData = await openaiResponse.json();

  if (!openaiResponse.ok) {
    throw new Error(JSON.stringify(aiData));
  }

  const text = aiData.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error(`OpenAI ga ikke svar: ${JSON.stringify(aiData)}`);
  }

  return JSON.parse(cleanJson(text)) as T;
}

async function checkChapterQuality({
  chapter,
  checkerContext,
}: {
  chapter: ChapterResult;
  checkerContext: string;
}) {
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

Kapittelet skal skrives om hvis:
- total_score er under 8
- følgesvennen er flat
- dialogen er generisk
- mysteriet løses for raskt
- en ny karakter forklarer for mye
- historien har tidsfeil
- kapittelet finner en stor hovedting for tidlig
- teksten føles som AI-barnebok

Kontekst:
${checkerContext}

Kapittel:
Tittel: ${chapter.title}
Oppsummering: ${chapter.summary}

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

  const result = await callOpenAiJson<CheckerResult>({
    system:
      'Du er en streng, men hjelpsom redaktør for norske barnebøker. Du svarer alltid med ren JSON.',
    user: checkerPrompt,
    temperature: 0.15,
  });

  return normalizeChecker(result);
}

async function rewriteChapter({
  originalPrompt,
  chapter,
  checker,
}: {
  originalPrompt: string;
  chapter: ChapterResult;
  checker: CheckerResult;
}) {
  const rewritePrompt = `
Du skal skrive kapittelet på nytt fordi redaktøren ikke godkjente første versjon.

REDATØRENS SCORE:
Total score: ${checker.total_score}/10
Character depth: ${checker.character_depth}/10
Companion use: ${checker.companion_use}/10
Mystery quality: ${checker.mystery_quality}/10
Dialogue quality: ${checker.dialogue_quality}/10
Variation: ${checker.variation}/10
Continuity: ${checker.continuity}/10
Bedtime feel: ${checker.bedtime_feel}/10

REDATØRENS INSTRUKSJONER:
${checker.rewrite_instructions}

VIKTIGE FORBEDRINGER:
- Gjør følgesvennen mer levende og aktiv.
- Fjern generisk dialog.
- Ikke la nye karakterer forklare hele løsningen.
- Ikke løs hovedmysteriet for raskt.
- Ikke finn selve hovedobjektet for tidlig hvis det bør bygges opp.
- Unngå tidsfeil.
- Behold rolig godnatthistorie-følelse.
- Behold korrekt hovedperson og følgesvenn.
- Behold JSON-formatet nøyaktig.

FØRSTE VERSJON:
${JSON.stringify(chapter, null, 2)}

OPPRINNELIG PROMPT:
${originalPrompt}

Svar KUN som gyldig JSON uten markdown:
{
  "title": "",
  "summary": "",
  "story_text": "",
  "continuity_update": "",
  "state_update": {
    "active_goal": "",
    "completed_goals": [],
    "found_items": [],
    "known_places": [],
    "known_characters": [],
    "open_mysteries": []
  },
  "character_updates": [
    {
      "name": "",
      "role": "",
      "personality": "",
      "description": "",
      "fear": "",
      "dream": "",
      "secret": "",
      "favorite_thing": "",
      "habit": ""
    }
  ]
}
`;

  const rewritten = await callOpenAiJson<ChapterResult>({
    system:
      'Du er en prisvinnende norsk barnebokforfatter og redaktør. Du skriver kapittelet på nytt slik at det føles som en ekte barnebokserie. Du svarer alltid med ren JSON.',
    user: rewritePrompt,
    temperature: 0.46,
  });

  return normalizeChapter(rewritten);
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

  const { data: bible, error: bibleError } = await supabaseAdmin
    .from('story_bibles')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bibleError || !bible) {
    return NextResponse.json(
      { error: 'Story Bible mangler. Generer Story Bible først.' },
      { status: 400 }
    );
  }

  const childName = child.child_name;
  const companionName = bible.companion_name;

  const { data: state } = await supabaseAdmin
    .from('story_state')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  const { data: previousStories } = await supabaseAdmin
    .from('stories')
    .select('chapter_number, title, summary, story_text')
    .eq('child_id', childId)
    .order('chapter_number', { ascending: false })
    .limit(6);

  const chronologicalStories = [...(previousStories || [])].reverse();
  const lastStory = chronologicalStories[chronologicalStories.length - 1];
  const nextChapter = (lastStory?.chapter_number || 0) + 1;

  const seasonNumber = Math.floor((nextChapter - 1) / 8) + 1;
  const chapterInSeason = ((nextChapter - 1) % 8) + 1;

  let { data: season } = await supabaseAdmin
    .from('story_seasons')
    .select('*')
    .eq('child_id', childId)
    .eq('season_number', seasonNumber)
    .maybeSingle();

  if (!season) {
    const seasonResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sovestjerne.no'}/api/generate-season`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ childId }),
      }
    );

    if (!seasonResponse.ok) {
      const result = await seasonResponse.json();
      return NextResponse.json(
        { error: result.error || 'Kunne ikke generere sesongplan.' },
        { status: 500 }
      );
    }

    const result = await seasonResponse.json();
    season = result.season;
  }

  const outline = Array.isArray(season?.season_outline)
    ? (season.season_outline as SeasonEpisode[])
    : [];

  const episodePlan =
    outline.find((episode) => Number(episode.chapter_in_season) === chapterInSeason) ||
    outline[chapterInSeason - 1];

  const storyStyle = createStoryStyle({
    childName,
    companionName,
    interests: child.interests,
    favoriteAnimal: child.favorite_animal,
    favoritePlace: child.favorite_place,
    favoriteColor: child.favorite_color,
    seasonTheme: season?.season_theme,
    mainQuest: season?.main_quest || bible.story_goal,
  });

  const styleBank = await getStoryStyleBank();

  const historyText =
    chronologicalStories.length > 0
      ? chronologicalStories
          .map(
            (story) =>
              `Kapittel ${story.chapter_number}: ${story.title || 'Uten tittel'}

Oppsummering:
${story.summary || ''}

Tekstutdrag:
${(story.story_text || '').slice(0, 1200)}
`
          )
          .join('\n\n')
      : 'Dette er første kapittel.';

  const { data: storyElements } = await supabaseAdmin
    .from('story_elements')
    .select('type, role, name, description, details')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const { data: storyCharacters } = await supabaseAdmin
    .from('story_characters')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('last_seen_chapter', { ascending: false });

  const elementsText =
    storyElements && storyElements.length > 0
      ? storyElements
          .map((element) => {
            const details =
              element.details && Object.keys(element.details).length > 0
                ? ` Detaljer: ${JSON.stringify(element.details)}`
                : '';

            return `- Type: ${element.type}. Rolle: ${
              element.role || '-'
            }. Navn: ${element.name || '-'}. Beskrivelse: ${
              element.description || '-'
            }.${details}`;
          })
          .join('\n')
      : 'Ingen ekstra elementer lagt til ennå.';

  const charactersText =
    storyCharacters && storyCharacters.length > 0
      ? storyCharacters
          .map(
            (c) => `
Navn: ${c.name}
Rolle: ${c.role || ''}
Personlighet: ${c.personality || ''}
Beskrivelse: ${c.description || ''}
Frykt: ${c.fear || ''}
Drøm: ${c.dream || ''}
Hemmelighet: ${c.secret || ''}
Favorittting: ${c.favorite_thing || ''}
Vane: ${c.habit || ''}
`
          )
          .join('\n')
      : 'Ingen registrerte karakterer ennå.';

  const stateText = `
Aktivt mål:
${state?.active_goal || 'Ingen aktivt mål lagret ennå.'}

Fullførte mål:
${asArray(state?.completed_goals).join(', ') || 'Ingen'}

Ting som allerede er funnet:
${asArray(state?.found_items).join(', ') || 'Ingen'}

Kjente steder:
${asArray(state?.known_places).join(', ') || 'Ingen'}

Kjente karakterer:
${asArray(state?.known_characters).join(', ') || 'Ingen'}

Åpne mysterier:
${asArray(state?.open_mysteries).join(', ') || 'Ingen'}
`;

  const prompt = `
Du skriver kapittel ${nextChapter} i en personlig norsk barnebokserie.

Dette er sesong ${seasonNumber}, kapittel ${chapterInSeason} av 8.

KRITISK NAVNELÅS:
- Hovedpersonen heter alltid ${childName}.
- Følgesvennen heter alltid ${companionName}.
- Ikke bruk andre navn på hovedperson eller følgesvenn.
- Ikke bytt navn.
- Ikke skriv at hovedpersonen heter ${companionName}.
- Ikke skriv at følgesvennen heter ${childName}.

Barn:
Navn: ${childName}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Drømmer: ${child.dreams || ''}

Story Bible:
Univers: ${bible.universe_name}
Hovedperson: ${childName}
Fast følgesvenn: ${companionName} (${bible.companion_type})
Følgesvennens personlighet: ${bible.companion_personality || ''}
Følgesvennens styrke: ${bible.companion_power || ''}
Følgesvennens svakhet: ${bible.companion_weakness || ''}
Følgesvennens hobby: ${bible.companion_hobby || ''}
Følgesvennens favorittuttrykk: ${bible.companion_phrase || ''}
Langtidsoppdrag: ${bible.story_goal}

STORY STATE:
${stateText}

Aktiv sesongplan:
Sesongtema: ${season?.season_theme || ''}
Sesongens hovedmål: ${season?.main_quest || bible.story_goal || ''}

Dagens kapittelplan:
Tittelidé: ${episodePlan?.chapter_title || ''}
Dagens mål: ${episodePlan?.chapter_goal || ''}
Nøkkelhendelse: ${episodePlan?.key_event || ''}
Avslutningskrok: ${episodePlan?.ending_hook || ''}

Aktive elementer:
${elementsText}

Eksisterende karakterer:
${charactersText}

Siste kapitler:
${historyText}

PERSONLIG HISTORIESTIL:
Åpningstype: ${styleBank.opening?.content || ''}
Avslutningstype: ${styleBank.ending?.content || ''}
Mysterietype: ${styleBank.mystery?.content || ''}
Dialogregel: ${styleBank.dialog?.content || ''}
Twist: ${styleBank.twist?.content || ''}

Foreslått åpning:
${storyStyle.opening}

Foreslått avslutning:
${storyStyle.ending}

Dagens mysterium:
${storyStyle.mysteryStyle}

Forfatterinstruksjoner:
${storyStyle.authorInstructions.join('\n')}

REGLER:
- Skriv på norsk.
- Barnet skal alltid være hovedpersonen.
- Bruk ${childName} som hovedperson.
- Bruk ${companionName} som følgesvenn.
- Historien skal være varm, trygg, magisk og barnevennlig.
- Passer som godnatthistorie.
- Lengde ca. 700–1000 ord.
- Dagens mål, nøkkelhendelse og avslutningskrok fra sesongplanen må brukes.
- Historien må aldri starte på nytt.
- Bruk minst én konkret ting fra tidligere kapitler.
- Ikke gå fra dag til natt uten overgang.
- Ikke la barnet finne selve hovedobjektet for tidlig.
- Ikke løs store mysterier i samme kapittel som de introduseres.
- Nye karakterer skal gi ledetråder, ikke komplette svar.
- Ingen ny karakter får løse hovedproblemet alene.
- Følgesvennen må gjøre minst én viktig handling.
- Følgesvennen skal ha egne tanker, reaksjoner og ideer.
- Følgesvennen skal ikke bare si "Ja!", "La oss!" eller "Så spennende!".
- Ikke finn på familie som ikke finnes i aktive elementer.
- Ingen banning, mobbing, våpen, krig, blod, skrekk, demoner, alkohol, tobakk, narkotika, pengespill eller voksenromantikk.

Svar KUN som gyldig JSON uten markdown:
{
  "title": "",
  "summary": "",
  "story_text": "",
  "continuity_update": "",
  "state_update": {
    "active_goal": "",
    "completed_goals": [],
    "found_items": [],
    "known_places": [],
    "known_characters": [],
    "open_mysteries": []
  },
  "character_updates": [
    {
      "name": "",
      "role": "",
      "personality": "",
      "description": "",
      "fear": "",
      "dream": "",
      "secret": "",
      "favorite_thing": "",
      "habit": ""
    }
  ]
}
`;

  let chapter: ChapterResult;
  let checker: CheckerResult | null = null;
  let wasRewritten = false;
  let checkerError: string | null = null;

  try {
    const generated = await callOpenAiJson<ChapterResult>({
      system:
        'Du er en prisvinnende norsk barnebokforfatter. Du følger navnelås strengt. Du skriver levende karakterer, gradvise mysterier og trygge godnatthistorier. Du svarer alltid med ren JSON.',
      user: prompt,
      temperature: 0.54,
    });

    chapter = normalizeChapter(generated);
    chapter = fixNames(chapter, childName, companionName);
  } catch (error) {
    return NextResponse.json(
      { error: `OpenAI-feil ved generering: ${errorMessage(error)}` },
      { status: 500 }
    );
  }

  const checkerContext = `
Barn: ${childName}
Følgesvenn: ${companionName}
Univers: ${bible.universe_name}
Langtidsoppdrag: ${bible.story_goal}

Dagens mål:
${episodePlan?.chapter_goal || ''}

Nøkkelhendelse:
${episodePlan?.key_event || ''}

Avslutningskrok:
${episodePlan?.ending_hook || ''}

Siste kapitler:
${historyText}
`;

  try {
    checker = await checkChapterQuality({ chapter, checkerContext });

    if (checker.should_rewrite || checker.total_score < 8) {
      chapter = await rewriteChapter({
        originalPrompt: prompt,
        chapter,
        checker,
      });

      chapter = fixNames(chapter, childName, companionName);
      wasRewritten = true;
    }
  } catch (error) {
    checkerError = errorMessage(error);
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

  const memoryUpdate = `
${bible.memory || ''}

Kapittel ${nextChapter}: ${chapter.continuity_update || chapter.summary || ''}
`.trim();

  await supabaseAdmin
    .from('story_bibles')
    .update({
      memory: memoryUpdate,
      current_chapter: nextChapter,
    })
    .eq('id', bible.id);

  const update = chapter.state_update || {};

  const nextState = {
    active_goal: update.active_goal || state?.active_goal || episodePlan?.chapter_goal || '',
    completed_goals: mergeUnique(state?.completed_goals, update.completed_goals),
    found_items: mergeUnique(state?.found_items, update.found_items),
    known_places: mergeUnique(state?.known_places, update.known_places),
    known_characters: mergeUnique(state?.known_characters, update.known_characters),
    open_mysteries: mergeUnique(state?.open_mysteries, update.open_mysteries),
    updated_at: new Date().toISOString(),
  };

  if (state?.id) {
    await supabaseAdmin.from('story_state').update(nextState).eq('id', state.id);
  } else {
    await supabaseAdmin.from('story_state').insert({
      child_id: childId,
      ...nextState,
      created_at: new Date().toISOString(),
    });
  }

  const characterUpdates = Array.isArray(chapter.character_updates)
    ? chapter.character_updates
    : [];

  for (const character of characterUpdates) {
    if (!character.name) continue;

    const { data: existingCharacter } = await supabaseAdmin
      .from('story_characters')
      .select('id')
      .eq('child_id', childId)
      .eq('name', character.name)
      .maybeSingle();

    if (existingCharacter) {
      await supabaseAdmin
        .from('story_characters')
        .update({
          role: character.role || '',
          personality: character.personality || '',
          description: character.description || '',
          fear: character.fear || '',
          dream: character.dream || '',
          secret: character.secret || '',
          favorite_thing: character.favorite_thing || '',
          habit: character.habit || '',
          last_seen_chapter: nextChapter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCharacter.id);
    } else {
      await supabaseAdmin.from('story_characters').insert({
        child_id: childId,
        name: character.name,
        role: character.role || '',
        personality: character.personality || '',
        description: character.description || '',
        fear: character.fear || '',
        dream: character.dream || '',
        secret: character.secret || '',
        favorite_thing: character.favorite_thing || '',
        habit: character.habit || '',
        first_chapter: nextChapter,
        last_seen_chapter: nextChapter,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    success: true,
    story: data,
    checker,
    wasRewritten,
    checkerError,
  });
}
