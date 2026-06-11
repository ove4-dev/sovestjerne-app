import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type SeasonEpisode = {
  chapter_in_season: number;
  chapter_title: string;
  chapter_goal: string;
  key_event: string;
  ending_hook: string;
};

type ThemeProfile = {
  world: string;
  mystery: string;
  mainObject: string;
  placeA: string;
  placeB: string;
  placeC: string;
  symbol: string;
  sound: string;
  smallItemA: string;
  smallItemB: string;
  helper: string;
};

function hasAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function getTheme(child: any): ThemeProfile {
  const text = `${child.interests || ''} ${child.favorite_place || ''} ${
    child.dreams || ''
  } ${child.favorite_animal || ''}`;

  if (
    hasAny(text, [
      'bil',
      'biler',
      'racing',
      'racer',
      'racerbane',
      'garasje',
      'motor',
      'mekking',
    ])
  ) {
    return {
      world: 'den gamle racerbanen',
      mystery: 'racerlegenden',
      mainObject: 'den gamle racerbilen',
      placeA: 'inngangen til racerbanen',
      placeB: 'den rustne pit-garasjen',
      placeC: 'tribunen med de falmede skiltene',
      symbol: 'et symbol formet som et lite hjul',
      sound: 'en svak motorlyd',
      smallItemA: 'en liten kartbit',
      smallItemB: 'et slitt metallmerke',
      helper: 'en eldre mekaniker som bare husker bruddstykker',
    };
  }

  if (hasAny(text, ['båt', 'hav', 'sjø', 'skip', 'pirat', 'skatt'])) {
    return {
      world: 'den gamle brygga',
      mystery: 'sjøkartets hemmelighet',
      mainObject: 'det forsvunne skipet',
      placeA: 'brygga ved det stille vannet',
      placeB: 'det gamle båthuset',
      placeC: 'fyrlykten på odden',
      symbol: 'et symbol formet som en bølge',
      sound: 'en svak klang fra vannet',
      smallItemA: 'en liten kartbit',
      smallItemB: 'et slitt kompassmerke',
      helper: 'en gammel havnevakt som bare vet litt',
    };
  }

  if (hasAny(text, ['dinosaur', 'fossil', 'dino'])) {
    return {
      world: 'dinosaurdalen',
      mystery: 'det glemte fossilet',
      mainObject: 'det store dinosaur-egget',
      placeA: 'stien inn mot dinosaurdalen',
      placeB: 'fossilveggen',
      placeC: 'de gamle steinformasjonene',
      symbol: 'et symbol formet som et lite fotspor',
      sound: 'en svak buldring fra bakken',
      smallItemA: 'en liten fossilbit',
      smallItemB: 'et slitt steinmerke',
      helper: 'en gammel fossilvokter som bare husker litt',
    };
  }

  return {
    world: 'det magiske stedet',
    mystery: 'det store mysteriet',
    mainObject: 'den skjulte hemmeligheten',
    placeA: 'den første stien',
    placeB: 'det gamle rommet',
    placeC: 'stedet med de rare tegnene',
    symbol: 'et lite ukjent symbol',
    sound: 'en svak, merkelig lyd',
    smallItemA: 'en liten kartbit',
    smallItemB: 'et slitt merke',
    helper: 'en vennlig hjelper som bare vet litt',
  };
}

function seasonOne(theme: ThemeProfile): SeasonEpisode[] {
  return [
    {
      chapter_in_season: 1,
      chapter_title: 'Det første tegnet',
      chapter_goal: `Oppdag ${theme.world} for første gang uten å løse mysteriet.`,
      key_event: `Barnet og følgesvennen finner ${theme.smallItemA}, men forstår ikke hva den betyr ennå.`,
      ending_hook: `${theme.smallItemA} viser et lite tegn som peker videre.`,
    },
    {
      chapter_in_season: 2,
      chapter_title: 'Symbolene på kartet',
      chapter_goal: 'Studere tegnene og kopiere dem uten å finne en ny stor gjenstand.',
      key_event: `De oppdager ${theme.symbol} på kartet. Ingen nøkkel skal finnes i dette kapittelet.`,
      ending_hook: `Symbolet ligner på noe ved ${theme.placeA}.`,
    },
    {
      chapter_in_season: 3,
      chapter_title: 'Lyden fra banen',
      chapter_goal: 'Følge en lyd og finne et lite spor, ikke en løsning.',
      key_event: `Følgesvennen hører ${theme.sound}. De finner bare et gammelt spor i bakken, ikke nøkkel og ikke ${theme.mainObject}.`,
      ending_hook: 'Lyden stopper ved et område de ikke kommer inn i ennå.',
    },
    {
      chapter_in_season: 4,
      chapter_title: 'Merket i støvet',
      chapter_goal: 'Finne en liten detalj som bekrefter at mysteriet er ekte.',
      key_event: `De finner ${theme.smallItemB} med samme symbol som kartet. Det gir ikke hele svaret.`,
      ending_hook: `${theme.smallItemB} reagerer svakt når følgesvennen kommer nær.`,
    },
    {
      chapter_in_season: 5,
      chapter_title: 'Et spor som ikke passer',
      chapter_goal: 'Oppdage at første tolkning av kartet kan være feil.',
      key_event: `De tror symbolet peker mot ${theme.placeB}, men finner bare et tegn som gjør mysteriet større.`,
      ending_hook: `Et nytt merke peker mot ${theme.placeC}.`,
    },
    {
      chapter_in_season: 6,
      chapter_title: 'Den som husker litt',
      chapter_goal: 'Møte en hjelper som gir en halv ledetråd, ikke hele svaret.',
      key_event: `De møter ${theme.helper}. Hjelperen forteller bare én liten ting og vet ikke løsningen.`,
      ending_hook: `Hjelperens ledetråd peker mot en låst del av ${theme.world}.`,
    },
    {
      chapter_in_season: 7,
      chapter_title: 'Nesten ved døren',
      chapter_goal: 'Komme nær en ny del av stedet, men ikke åpne den helt.',
      key_event:
        'Barnet og følgesvennen finner en låst port, dør eller sti. De mangler fortsatt noe for å komme videre.',
      ending_hook: 'Et symbol på porten matcher kartet, men én del mangler.',
    },
    {
      chapter_in_season: 8,
      chapter_title: 'Den lille løsningen',
      chapter_goal: 'Løse sesongens lille mysterium: hva det første tegnet betyr.',
      key_event: `De forstår at tegnet ikke peker på ${theme.mainObject}, men på neste område de må undersøke.`,
      ending_hook: `Neste sesong handler om å finne veien inn i den skjulte delen av ${theme.world}.`,
    },
  ];
}

function laterSeason(theme: ThemeProfile, seasonNumber: number): SeasonEpisode[] {
  return [
    {
      chapter_in_season: 1,
      chapter_title: 'Et nytt spørsmål',
      chapter_goal: `Åpne et nytt lite mysterium i ${theme.world}.`,
      key_event: 'Barnet og følgesvennen finner et nytt tegn.',
      ending_hook: 'Tegnet peker mot et kjent sted.',
    },
    {
      chapter_in_season: 2,
      chapter_title: 'Det kjente stedet',
      chapter_goal: 'Besøke et kjent sted med en ny detalj.',
      key_event: 'Noe har forandret seg siden sist.',
      ending_hook: 'Forandringen gir dem et nytt spor.',
    },
    {
      chapter_in_season: 3,
      chapter_title: 'Følgesvennens idé',
      chapter_goal: 'La følgesvennen påvirke handlingen med en egen idé.',
      key_event: 'Følgesvennen legger merke til noe barnet overser.',
      ending_hook: 'Ideen peker mot et lite spor.',
    },
    {
      chapter_in_season: 4,
      chapter_title: 'Et lite funn',
      chapter_goal: 'Finne én liten gjenstand eller detalj.',
      key_event: 'Gjenstanden gir et nytt spørsmål, ikke en løsning.',
      ending_hook: 'Gjenstanden reagerer på et kjent symbol.',
    },
    {
      chapter_in_season: 5,
      chapter_title: 'Feil tolkning',
      chapter_goal: 'Tro at de forstår sporet, men oppdage at de mangler noe.',
      key_event: 'De følger en mulig forklaring som ikke stemmer helt.',
      ending_hook: 'En gammel detalj får ny betydning.',
    },
    {
      chapter_in_season: 6,
      chapter_title: 'To spor blir ett',
      chapter_goal: 'Koble sammen to tidligere spor.',
      key_event: 'Barnet og følgesvennen ser sammenhengen.',
      ending_hook: 'Sammenhengen peker mot sesongens lille svar.',
    },
    {
      chapter_in_season: 7,
      chapter_title: 'Rett før løsningen',
      chapter_goal: 'Forstå nesten hele sesongmysteriet.',
      key_event: 'De finner siste del av sesongens lille spor.',
      ending_hook: 'De må bruke alt de har lært.',
    },
    {
      chapter_in_season: 8,
      chapter_title: 'Den lille løsningen',
      chapter_goal: 'Løse bare sesongens lille mysterium.',
      key_event: 'Langtidsmysteriet står fortsatt åpent.',
      ending_hook: `Sesong ${seasonNumber + 1} får et nytt spørsmål.`,
    },
  ];
}

function buildSeasonPlan({
  child,
  bible,
  seasonNumber,
}: {
  child: any;
  bible: any;
  seasonNumber: number;
}) {
  const theme = getTheme(child);
  const childName = child.child_name;
  const companionName = bible.companion_name;

  if (seasonNumber === 1) {
    return {
      season_theme: `Sesong 1: Første mysterium ved ${theme.world}`,
      main_quest: `${childName} og ${companionName} skal forstå det første tegnet i ${theme.world}, uten å finne eller løse hele ${theme.mystery}.`,
      season_outline: seasonOne(theme),
    };
  }

  return {
    season_theme: `Sesong ${seasonNumber}: Et nytt lag av ${theme.mystery}`,
    main_quest: `${childName} og ${companionName} skal løse ett lite delmål i ${theme.mystery}, mens langtidsmysteriet fortsatt står åpent.`,
    season_outline: laterSeason(theme, seasonNumber),
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
    .select('season_number')
    .eq('child_id', childId)
    .order('season_number', { ascending: true });

  const lastSeasonNumber =
    previousSeasons && previousSeasons.length > 0
      ? Math.max(...previousSeasons.map((season) => Number(season.season_number || 0)))
      : 0;

  const nextSeasonNumber = lastSeasonNumber + 1;

  const seasonPlan = buildSeasonPlan({
    child,
    bible,
    seasonNumber: nextSeasonNumber,
  });

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
  });
}
