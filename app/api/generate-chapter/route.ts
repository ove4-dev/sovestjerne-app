import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createStoryStyle } from '../../../lib/story-style-engine';

type SeasonEpisode = {
  chapter_in_season: number;
  chapter_title?: string;
  chapter_goal?: string;
  key_event?: string;
  ending_hook?: string;
};

function asArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function mergeUnique(oldItems: unknown, newItems: unknown): string[] {
  const combined = [...asArray(oldItems), ...asArray(newItems)];
  return Array.from(new Set(combined.map((item) => item.trim()).filter(Boolean)));
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
    childName: child.child_name,
    interests: child.interests,
    favoriteAnimal: child.favorite_animal,
    favoritePlace: child.favorite_place,
    favoriteColor: child.favorite_color,
    seasonTheme: season?.season_theme,
    mainQuest: season?.main_quest || bible.story_goal,
  });

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

VIKTIG:
Dette er IKKE en enkeltstående historie.
Dette er neste episode i samme serie.
Du MÅ følge sesongplanen, dagens kapittelmål og story_state.

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
Fast følgesvenn: ${bible.companion_name} (${bible.companion_type})
Langtidsoppdrag: ${bible.story_goal}
Minne/historikk:
${bible.memory || 'Ingen ekstra minne ennå.'}

STORY STATE:
${stateText}

VIKTIGE STATE-REGLER:
- Ikke la barnet finne en gjenstand som allerede står under "Ting som allerede er funnet".
- Ikke la barnet fullføre et mål som allerede står under "Fullførte mål".
- Ikke gjenta samme gjennombrudd fra tidligere kapitler.
- Bruk "Åpne mysterier" til å skape fremdrift.
- Oppdater state_update tydelig etter kapittelet.

Aktiv sesongplan:
Sesongtema: ${season?.season_theme || ''}
Sesongens hovedmål: ${season?.main_quest || bible.story_goal || ''}

Dagens kapittelplan:
Tittelidé: ${episodePlan?.chapter_title || ''}
Dagens mål: ${episodePlan?.chapter_goal || ''}
Nøkkelhendelse: ${episodePlan?.key_event || ''}
Avslutningskrok: ${episodePlan?.ending_hook || ''}

Aktive elementer fra foreldre / barnets verden:
${elementsText}

Eksisterende karakterer:
${charactersText}

Siste kapitler:
${historyText}

PERSONLIG HISTORIESTIL:

Foreslått åpning:
${storyStyle.opening}

Foreslått avslutning:
${storyStyle.ending}

Dagens mysterium:
${storyStyle.mysteryStyle}

Forfatterinstruksjoner:
${storyStyle.authorInstructions.join('\n')}

SOVESTJERNE-STIL:

- Skriv som en ekte barnebokforfatter, ikke som en AI-assistent.
- Vis følelser gjennom handling.
- Ikke forklar moralen rett ut.
- Unngå setninger som "Kari lærte at...".
- Bruk heller varme øyeblikk, små detaljer og dialog.
- Historien skal ha mer eventyr, mysterium og oppdagelse enn prat om regler.
- Barnet skal kjenne mestring, nysgjerrighet og trygghet.
- Del story_text inn i tydelige avsnitt.
- Bruk blank linje mellom avsnitt.
- Dialog skal ofte stå på egen linje.

KAPITTELSTRUKTUR:

1. Bruk den foreslåtte åpningen som inspirasjon.
2. Fortsettelse fra forrige kapittel.
3. Dagens mål fra sesongplanen.
4. Liten utfordring eller undring.
5. Samarbeid mellom barnet og følgesvennen.
6. Konkret fremgang i hovedhistorien.
7. Bruk den foreslåtte avslutningen som inspirasjon.
8. En mild krok til neste kapittel.

REGLER:

- Skriv på norsk.
- Barnet skal alltid være hovedpersonen.
- Historien skal være varm, trygg, magisk og barnevennlig.
- Passer som godnatthistorie.
- Lengde ca. 700–1000 ord.
- Dagens mål, nøkkelhendelse og avslutningskrok fra sesongplanen må brukes.
- Hvis sesongplanen sier at noe skal finnes, oppdages eller forstås, må det faktisk skje i kapittelet.
- Ikke bruk flere kapitler på samme lille hendelse med mindre sesongplanen krever det.
- Hvert kapittel må endre noe.

SERIEREGLER:

- Historien må aldri starte på nytt.
- Historien må aldri føles som første kapittel igjen.
- Bruk minst én konkret ting fra tidligere kapitler eller serie-minnet.
- Gjenbruk etablerte steder, figurer og gjenstander.
- Ikke lag en ny hovedhistorie hvis en allerede finnes.
- Ikke bytt ut hovedoppdraget midt i serien.
- Ikke bytt univers.

KARAKTERREGLER:

- Gjenbruk eksisterende karakterer før nye introduseres.
- Hvis en karakter allerede finnes, behold navn, rolle og personlighet.
- Ikke introduser en ny viktig karakter hvis en eksisterende karakter kan fylle rollen.
- Maks én ny viktig karakter i dette kapittelet.
- Nye karakterer skal ha en tydelig rolle i hovedhistorien.
- Følgesvennen skal være den viktigste karakteren etter barnet.
- Følgesvennen skal ha egen personlighet, varme, humor og meninger.
- Følgesvennen skal bidra aktivt til løsningen.
- Ikke bytt ut fast følgesvenn.
- Ikke endre navn på følgesvennen. Følgesvennen heter alltid ${bible.companion_name}.
- Bruk familie, venner, kjæledyr eller andre elementer fra "Aktive elementer" naturlig og forsiktig.
- Ikke finn på mamma, pappa, søsken eller familie som ikke finnes i aktive elementer.
- Nye elementer fra foreldre skal flettes gradvis inn. Ikke press alt inn på én gang.

KRITISK NAVNELÅS:

Følgesvennen heter alltid ${bible.companion_name}.

Du har ikke lov til å gi følgesvennen et nytt navn.

Hvis du bruker et annet navn enn ${bible.companion_name}, er kapittelet feil.

Før du svarer skal du kontrollere at følgesvennen kun omtales som ${bible.companion_name}.

NAVNEREGLER:

- Bruk korte, varme og barnevennlige navn.
- Foretrekk norske, nordiske eller universelle barnenavn.
- Unngå navn som virker tilfeldige, rare, komiske eller malplasserte.
- Ikke bruk navn som virker for voksne, aggressive eller useriøse.
- Gjenbruk etablerte navn før du lager nye.

TRYGGHETSREGLER:

- Ingen banning.
- Ingen mobbing.
- Ingen nedsettende språk.
- Ingen våpen.
- Ingen krig.
- Ingen blod eller skader.
- Ingen skrekkhistorier.
- Ingen demoner.
- Ingen alkohol, tobakk, narkotika eller pengespill.
- Ingen voksenromantikk.
- Ingen voldelige eller truende situasjoner.

AVSLUTNING:

- Dagens lille hendelse skal lukkes.
- Barnet skal føle trygghet.
- Kapittelet skal slutte rolig nok for leggetid.
- Avslutningen skal samtidig gi en mild forventning til neste kapittel.
- Bruk avslutningskroken fra sesongplanen.
- Bruk den foreslåtte avslutningen som inspirasjon.
- Unngå generiske avslutninger som bare sier "de gledet seg til neste dag".

Svar KUN som gyldig JSON uten markdown:
{
  "title": "",
  "summary": "Kort oppsummering av akkurat dette kapittelet.",
  "story_text": "",
  "continuity_update": "Kort oppdatering til serie-minnet: hva skjedde, hva ble funnet, hvem ble introdusert, og hva bør følges opp senere.",
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
      "description": ""
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
            'Du er hovedforfatter og redaktør for en sammenhengende norsk barnebokserie. Du følger alltid sesongplanen, story_state, eksisterende karakterer og personlig historiestil. Din viktigste jobb er kontinuitet, trygghet, varme, progresjon, variasjon, god avslutning og ekte serie-følelse. Du svarer alltid med ren JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.56,
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

  const correctCompanionName = bible.companion_name;
  const wrongCompanionNames = ['Bobby', 'Max', 'Milo', 'Nova'];

  for (const wrongName of wrongCompanionNames) {
    if (wrongName !== correctCompanionName) {
      chapter.story_text = chapter.story_text?.replaceAll(wrongName, correctCompanionName);
      chapter.summary = chapter.summary?.replaceAll(wrongName, correctCompanionName);
      chapter.title = chapter.title?.replaceAll(wrongName, correctCompanionName);
      chapter.continuity_update = chapter.continuity_update?.replaceAll(
        wrongName,
        correctCompanionName
      );
    }
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
    await supabaseAdmin
      .from('story_state')
      .update(nextState)
      .eq('id', state.id);
  } else {
    await supabaseAdmin
      .from('story_state')
      .insert({
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
          last_seen_chapter: nextChapter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCharacter.id);
    } else {
      await supabaseAdmin
        .from('story_characters')
        .insert({
          child_id: childId,
          name: character.name,
          role: character.role || '',
          personality: character.personality || '',
          description: character.description || '',
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
  });
}
