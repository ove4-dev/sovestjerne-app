import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type SeasonEpisode = {
  chapter_in_season: number;
  chapter_title: string;
  chapter_goal: string;
  key_event: string;
  ending_hook: string;
};

type SeasonPlan = {
  season_theme: string;
  main_quest: string;
  season_rule: string;
  forbidden_progress: string;
  carry_forward_mystery: string;
  season_outline: SeasonEpisode[];
};

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getSeasonStage(seasonNumber: number) {
  if (seasonNumber === 1) {
    return {
      name: 'Oppdagelse',
      purpose:
        'Barnet skal oppdage universet, første sted, første ledetråd og første spørsmål. Hovedmysteriet skal IKKE løses.',
      allowed:
        'Kart, symboler, lyder, gamle spor, små funn, låste dører, rykter, halvferdige ledetråder.',
      forbidden:
        'Ikke finn hovedobjektet. Ikke reparer hovedobjektet. Ikke bruk hovedobjektet. Ikke forklar hele historien.',
    };
  }

  if (seasonNumber === 2) {
    return {
      name: 'Første fordypning',
      purpose:
        'Barnet skal forstå at mysteriet er større enn først antatt. Det skal dukke opp nye lag, men ikke endelig svar.',
      allowed:
        'Deler, gamle notater, nye steder, én ny hjelper, feilspor, små gjennombrudd.',
      forbidden:
        'Ikke løse hovedmysteriet. Ikke la en voksen forklare alt. Ikke gjøre hovedobjektet klart til bruk.',
    };
  }

  if (seasonNumber === 3) {
    return {
      name: 'Verdensbygging',
      purpose:
        'Utvid universet med nye steder, regler, gamle historier og karakterhemmeligheter.',
      allowed:
        'Nytt område, gammel tradisjon, skjult rom, karakterhemmelighet, ny liten gåte.',
      forbidden:
        'Ikke starte serien på nytt. Ikke bytte univers. Ikke gjøre hovedmålet ferdig.',
    };
  }

  const cycle = seasonNumber % 5;

  if (cycle === 0) {
    return {
      name: 'Karakter-sesong',
      purpose:
        'La en kjent karakter få mer dybde, et lite personlig problem eller en hemmelighet som påvirker reisen.',
      allowed:
        'Frykt, vane, drøm, hemmelighet, gammel feil, vennskap, liten indre utfordring.',
      forbidden:
        'Ikke la karakteren løse alt. Ikke glem hovedpersonen og følgesvennen.',
      };
  }

  if (cycle === 1) {
    return {
      name: 'Nytt område',
      purpose:
        'Åpne et nytt sted i samme univers, med egne regler, stemning og små mysterier.',
      allowed:
        'Ny sti, ny del av kartet, nytt rom, ny dal, ny brygge, ny garasje, ny port.',
      forbidden:
        'Ikke bytt univers. Ikke gjør det til en helt ny serie.',
    };
  }

  if (cycle === 2) {
    return {
      name: 'Gjenstands-sesong',
      purpose:
        'Fokuser på én mindre gjenstand som har betydning, men ikke er hele hovedmålet.',
      allowed:
        'Nøkkel, emblem, hjul, fjær, lapp, krystallbit, kompass, kartbit, liten mekanisme.',
      forbidden:
        'Ikke finn hele hovedobjektet. Ikke la gjenstanden gi hele svaret.',
    };
  }

  if (cycle === 3) {
    return {
      name: 'Mysterium-sesong',
      purpose:
        'Bygg et lite mysterium som kan løses i sesongen, men som åpner et større spørsmål.',
      allowed:
        'Forsvunnet tegn, merkelig lyd, feilspor, glemt beskjed, skjult mønster.',
      forbidden:
        'Ikke løse langtidsoppdraget. Ikke avslør alt i kapittel 1–4.',
    };
  }

  return {
    name: 'Fremdrift-sesong',
    purpose:
      'Gi tydelig fremgang i hovedhistorien uten å avslutte den. Én ting kan forstås, men to nye spørsmål bør åpnes.',
    allowed:
      'Delvis svar, ny retning, ny ledetråd, liten seier, ny usikkerhet.',
    forbidden:
      'Ikke fullføre hovedoppdraget. Ikke gi alt barnet leter etter.',
  };
}

function fallbackSeasonPlan({
  childName,
  companionName,
  seasonNumber,
  stage,
}: {
  childName: string;
  companionName: string;
  seasonNumber: number;
  stage: ReturnType<typeof getSeasonStage>;
}): SeasonPlan {
  return {
    season_theme: `Sesong ${seasonNumber}: ${stage.name}`,
    main_quest: `${childName} og ${companionName} skal finne én ny ledetråd uten å løse hele mysteriet.`,
    season_rule:
      'Sesongen skal gi fremgang, men ikke løse hovedhistorien. Hvert kapittel skal åpne litt mer av verden.',
    forbidden_progress: stage.forbidden,
    carry_forward_mystery:
      'Minst ett viktig spørsmål skal stå åpent til neste sesong.',
    season_outline: [
      {
        chapter_in_season: 1,
        chapter_title: 'Et nytt tegn',
        chapter_goal: 'Oppdag et lite tegn eller spor som peker mot noe større.',
        key_event: 'Barnet og følgesvennen finner en ufullstendig ledetråd.',
        ending_hook: 'Ledetråden peker mot et sted de ikke forstår ennå.',
      },
      {
        chapter_in_season: 2,
        chapter_title: 'Det første sporet',
        chapter_goal: 'Undersøk ledetråden uten å få hele svaret.',
        key_event: 'Følgesvennen oppdager noe hovedpersonen overser.',
        ending_hook: 'Et nytt symbol eller en lyd dukker opp.',
      },
      {
        chapter_in_season: 3,
        chapter_title: 'Feil vei',
        chapter_goal: 'Følge et spor som først virker riktig, men som bare gir en del av svaret.',
        key_event: 'De lærer noe nytt om stedet eller historien.',
        ending_hook: 'De skjønner at mysteriet er større enn de trodde.',
      },
      {
        chapter_in_season: 4,
        chapter_title: 'Den skjulte delen',
        chapter_goal: 'Finne en liten gjenstand, del eller beskjed.',
        key_event: 'Gjenstanden gir et nytt spørsmål, ikke en løsning.',
        ending_hook: 'Gjenstanden reagerer på følgesvennen.',
      },
      {
        chapter_in_season: 5,
        chapter_title: 'En vennlig hindring',
        chapter_goal: 'Møte en liten utfordring som krever samarbeid.',
        key_event: 'Følgesvennens personlighet eller svakhet påvirker valget deres.',
        ending_hook: 'De finner en retning, men ikke målet.',
      },
      {
        chapter_in_season: 6,
        chapter_title: 'Nesten riktig',
        chapter_goal: 'Forstå hva en tidligere ledetråd egentlig betydde.',
        key_event: 'De kobler sammen to ting fra tidligere kapitler.',
        ending_hook: 'En ny dør, sti eller mulighet åpner seg.',
      },
      {
        chapter_in_season: 7,
        chapter_title: 'Før svaret',
        chapter_goal: 'Komme nær et svar, men oppdage at noe fortsatt mangler.',
        key_event: 'De får en liten seier, men ikke hovedløsningen.',
        ending_hook: 'Det siste tegnet peker mot sesongens avslutning.',
      },
      {
        chapter_in_season: 8,
        chapter_title: 'Den lille løsningen',
        chapter_goal: 'Løse sesongens lille mysterium, men åpne et større spørsmål.',
        key_event: 'Barnet og følgesvennen forstår én viktig ting.',
        ending_hook: 'Et nytt mysterium peker mot neste sesong.',
      },
    ],
  };
}

function normalizeSeasonPlan(value: unknown, fallback: SeasonPlan): SeasonPlan {
  const item = value as Partial<SeasonPlan>;

  const outline = Array.isArray(item?.season_outline)
    ? item.season_outline
        .slice(0, 8)
        .map((episode, index) => {
          const ep = episode as Partial<SeasonEpisode>;

          return {
            chapter_in_season: Number(ep.chapter_in_season || index + 1),
            chapter_title:
              safeText(ep.chapter_title) ||
              fallback.season_outline[index]?.chapter_title ||
              `Kapittel ${index + 1}`,
            chapter_goal:
              safeText(ep.chapter_goal) ||
              fallback.season_outline[index]?.chapter_goal ||
              'Finn en liten ledetråd uten å løse hele mysteriet.',
            key_event:
              safeText(ep.key_event) ||
              fallback.season_outline[index]?.key_event ||
              'Barnet og følgesvennen gjør en liten oppdagelse.',
            ending_hook:
              safeText(ep.ending_hook) ||
              fallback.season_outline[index]?.ending_hook ||
              'Et nytt spørsmål står igjen.',
          };
        })
    : fallback.season_outline;

  while (outline.length < 8) {
    outline.push(fallback.season_outline[outline.length]);
  }

  return {
    season_theme: safeText(item?.season_theme) || fallback.season_theme,
    main_quest: safeText(item?.main_quest) || fallback.main_quest,
    season_rule: safeText(item?.season_rule) || fallback.season_rule,
    forbidden_progress:
      safeText(item?.forbidden_progress) || fallback.forbidden_progress,
    carry_forward_mystery:
      safeText(item?.carry_forward_mystery) || fallback.carry_forward_mystery,
    season_outline: outline,
  };
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

  const { data: previousSeasons } = await supabaseAdmin
    .from('story_seasons')
    .select('season_number, season_theme, main_quest, season_outline, status')
    .eq('child_id', childId)
    .order('season_number', { ascending: true });

  const lastSeasonNumber =
    previousSeasons && previousSeasons.length > 0
      ? Math.max(...previousSeasons.map((season) => Number(season.season_number || 0)))
      : 0;

  const nextSeasonNumber = lastSeasonNumber + 1;
  const stage = getSeasonStage(nextSeasonNumber);

  const { data: state } = await supabaseAdmin
    .from('story_state')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  const { data: recentStories } = await supabaseAdmin
    .from('stories')
    .select('chapter_number, title, summary, story_text')
    .eq('child_id', childId)
    .order('chapter_number', { ascending: false })
    .limit(16);

  const { data: characters } = await supabaseAdmin
    .from('story_characters')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('last_seen_chapter', { ascending: false })
    .limit(20);

  const childName = child.child_name;
  const companionName = bible.companion_name;

  const previousSeasonsText =
    previousSeasons && previousSeasons.length > 0
      ? previousSeasons
          .map(
            (season) => `
Sesong ${season.season_number}: ${season.season_theme || ''}
Mål: ${season.main_quest || ''}
`
          )
          .join('\n')
      : 'Ingen tidligere sesonger.';

  const recentStoriesText =
    recentStories && recentStories.length > 0
      ? [...recentStories]
          .reverse()
          .map(
            (story) => `
Kapittel ${story.chapter_number}: ${story.title || ''}
Oppsummering: ${story.summary || ''}
`
          )
          .join('\n')
      : 'Ingen tidligere kapitler.';

  const stateText = `
Aktivt mål: ${state?.active_goal || 'Ingen'}
Fullførte mål: ${Array.isArray(state?.completed_goals) ? state.completed_goals.join(', ') : 'Ingen'}
Funnet: ${Array.isArray(state?.found_items) ? state.found_items.join(', ') : 'Ingen'}
Kjente steder: ${Array.isArray(state?.known_places) ? state.known_places.join(', ') : 'Ingen'}
Åpne mysterier: ${Array.isArray(state?.open_mysteries) ? state.open_mysteries.join(', ') : 'Ingen'}
`;

  const charactersText =
    characters && characters.length > 0
      ? characters
          .map(
            (character) => `
${character.name || ''}:
Rolle: ${character.role || ''}
Personlighet: ${character.personality || ''}
Frykt: ${character.fear || ''}
Drøm: ${character.dream || ''}
Hemmelighet: ${character.secret || ''}
`
          )
          .join('\n')
      : 'Ingen etablerte karakterer ennå.';

  const fallback = fallbackSeasonPlan({
    childName,
    companionName,
    seasonNumber: nextSeasonNumber,
    stage,
  });

  const prompt = `
Du lager sesong ${nextSeasonNumber} for en personlig norsk barnebokserie som skal kunne vare i 200+ kapitler.

Dette er IKKE en enkeltstående historie.
Dette er én sesong av en lang serie.

BARN:
Navn: ${childName}
Alder: ${child.child_age}
Favorittdyr: ${child.favorite_animal || ''}
Favorittfarge: ${child.favorite_color || ''}
Favorittsted: ${child.favorite_place || ''}
Interesser: ${child.interests || ''}
Personlighet: ${child.personality || ''}
Drømmer: ${child.dreams || ''}

STORY BIBLE:
Univers: ${bible.universe_name}
Hovedperson: ${childName}
Fast følgesvenn: ${companionName} (${bible.companion_type})
Følgesvennens personlighet: ${bible.companion_personality || ''}
Følgesvennens styrke: ${bible.companion_power || ''}
Følgesvennens svakhet: ${bible.companion_weakness || ''}
Følgesvennens hobby: ${bible.companion_hobby || ''}
Følgesvennens favorittuttrykk: ${bible.companion_phrase || ''}
Langtidsoppdrag: ${bible.story_goal}

TIDLIGERE SESONGER:
${previousSeasonsText}

SISTE KAPITLER:
${recentStoriesText}

STORY STATE:
${stateText}

ETABLERTE KARAKTERER:
${charactersText}

DENNE SESONGENS FUNKSJON:
Navn: ${stage.name}
Formål: ${stage.purpose}
Tillatt fremdrift: ${stage.allowed}
Forbudt fremdrift: ${stage.forbidden}

KRITISK:
- Serien skal kunne vare i 200+ kapitler.
- Sesongen må bare løse et LITE delmål.
- Langtidsoppdraget skal IKKE løses.
- Ikke finn, reparer eller bruk hovedobjektet for tidlig.
- Ikke la en voksen eller ny karakter forklare hele løsningen.
- Hvert kapittel skal gi én liten fremgang, ikke et stort hopp.
- Kapittel 1–2 skal introdusere tegn/spørsmål.
- Kapittel 3–4 skal gi delvise ledetråder.
- Kapittel 5–6 skal gi komplikasjon eller ny forståelse.
- Kapittel 7 skal gi nesten-svar.
- Kapittel 8 skal løse sesongens lille delmål, men åpne større mysterium.
- Følgesvennen må få rom til å påvirke handlingen.
- Gjenbruk etablerte steder, gjenstander og karakterer.
- Ikke start serien på nytt.
- Ikke bytt univers.
- Ikke bytt hovedperson eller følgesvenn.

NAVNELÅS:
- Hovedpersonen heter alltid ${childName}.
- Følgesvennen heter alltid ${companionName}.
- Ikke bytt navn.

Lag nøyaktig 8 kapitler.

Svar KUN som gyldig JSON uten markdown:
{
  "season_theme": "",
  "main_quest": "",
  "season_rule": "",
  "forbidden_progress": "",
  "carry_forward_mystery": "",
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

  let seasonPlan: SeasonPlan;

  try {
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
              'Du er hovedforfatter og showrunner for en lang norsk barnebokserie. Du planlegger sesonger som kan vare i 200+ kapitler uten at hovedmysteriet løses for tidlig. Du svarer alltid med ren JSON.',
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
        { error: 'OpenAI-feil ved sesongplan.', details: aiData },
        { status: 500 }
      );
    }

    const text = aiData.choices?.[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { error: 'OpenAI ga ikke sesongplan.', details: aiData },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(cleanJson(text));
    seasonPlan = normalizeSeasonPlan(parsed, fallback);
  } catch {
    seasonPlan = fallback;
  }

  await supabaseAdmin
    .from('story_seasons')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('child_id', childId)
    .eq('status', 'active');

  const { data, error } = await supabaseAdmin
    .from('story_seasons')
    .insert({
      child_id: childId,
      season_number: nextSeasonNumber,
      season_theme: seasonPlan.season_theme,
      main_quest: seasonPlan.main_quest,
      season_outline: seasonPlan.season_outline,
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

  return NextResponse.json({
    success: true,
    season: data,
    season_meta: {
      season_rule: seasonPlan.season_rule,
      forbidden_progress: seasonPlan.forbidden_progress,
      carry_forward_mystery: seasonPlan.carry_forward_mystery,
      stage,
    },
  });
}
