type StoryStyleInput = {
  childName: string;
  companionName?: string | null;
  interests?: string | null;
  favoriteAnimal?: string | null;
  favoritePlace?: string | null;
  favoriteColor?: string | null;
  seasonTheme?: string | null;
  mainQuest?: string | null;
};

function pickRandom(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function clean(value?: string | null) {
  return value?.trim() || '';
}

function createInterestHooks(interest: string) {
  const lower = interest.toLowerCase();

  if (lower.includes('bil')) {
    return {
      openings: [
        'Noe merkelig hadde skjedd ved den gamle racerbanen.',
        'Et ukjent hjulspor dukket opp i bakken.',
        'Følgesvennen fant en glitrende bildel ingen hadde sett før.',
        'En mystisk garasje hadde plutselig dukket opp på kartet.',
      ],
      mysteries: [
        'den forsvunne racernøkkelen',
        'den hemmelige motorhulen',
        'det gylne kartet til racerbanen',
      ],
    };
  }

  if (lower.includes('båt') || lower.includes('hav')) {
    return {
      openings: [
        'Et merkelig lys blinket ute på vannet.',
        'Noen hadde fortøyd en ukjent båt ved brygga.',
        'Følgesvennen fant et gammelt sjøkart.',
        'Bølgene bar med seg en hemmelig melding.',
      ],
      mysteries: [
        'fyrlykten som forsvant',
        'kapteinens hemmelige kart',
        'de syv havnøklene',
      ],
    };
  }

  if (lower.includes('dinosaur')) {
    return {
      openings: [
        'Et enormt fotspor hadde dukket opp i sanden.',
        'Noen hadde sett noe bevege seg ved dinosaurdalen.',
        'Følgesvennen fant et merkelig fossil.',
        'Et gammelt kart pekte mot de tapte dinosaurfjellene.',
      ],
      mysteries: [
        'det glemte fossilet',
        'de tapte dinosaurfjellene',
        'egget som glødet om natten',
      ],
    };
  }

  if (lower.includes('fotball')) {
    return {
      openings: [
        'En fotball lå midt på stien uten at noen visste hvorfor.',
        'Noen hadde tegnet et merkelig symbol på fotballbanen.',
        'Et gammelt trofé glitret i solen.',
        'Følgesvennen fant et spor ved målstreken.',
      ],
      mysteries: [
        'det forsvunne troféet',
        'den hemmelige banen',
        'den gylne fotballen',
      ],
    };
  }

  if (lower.includes('hest')) {
    return {
      openings: [
        'Et nytt hovspor hadde dukket opp ved stallen.',
        'En hvit hest stod plutselig på engen.',
        'Følgesvennen fant en merkelig hestesko.',
        'Noen hadde flettet blomster i gjerdet.',
      ],
      mysteries: [
        'den forsvunne hesteskoen',
        'engen med sølvgress',
        'den hemmelige rideveien',
      ],
    };
  }

  if (
    lower.includes('rom') ||
    lower.includes('planet') ||
    lower.includes('stjerne')
  ) {
    return {
      openings: [
        'En ny stjerne blinket på himmelen.',
        'Kartet viste plutselig en ukjent planet.',
        'Et svakt lys kom fra verdensrommet.',
        'Følgesvennen oppdaget et stjernespor.',
      ],
      mysteries: [
        'den tapte stjerneporten',
        'planeten ingen hadde besøkt',
        'det syngende stjernekartet',
      ],
    };
  }

  return { openings: [], mysteries: [] };
}

export function createStoryStyle(input: StoryStyleInput) {
  const childName = clean(input.childName) || 'barnet';

  const companion =
    clean(input.companionName) ||
    clean(input.favoriteAnimal) ||
    'følgesvennen';

  const interestsList = (input.interests || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const primaryInterest =
    interestsList[Math.floor(Math.random() * interestsList.length)] ||
    'eventyr';

  const place = clean(input.favoritePlace) || 'et magisk sted';
  const color = clean(input.favoriteColor) || 'gyllen';
  const quest = clean(input.mainQuest) || 'det store mysteriet';

  const interestData = createInterestHooks(primaryInterest);

  const openings = [
    ...interestData.openings,
    `${childName} la merke til noe merkelig ved ${place}.`,
    `Det var noe annerledes med ${place} denne gangen.`,
    `${companion} stoppet plutselig og lyttet.`,
    `Et ${color} lys blinket svakt foran dem.`,
    `${childName} klarte ikke slutte å tenke på ${quest}.`,
    'Noe hadde forandret seg siden forrige eventyr.',
    'Et lite spor dukket opp der ingen hadde sett før.',
    'Luften dirret som om et nytt mysterium var på vei.',
    `${companion} fant noe som ikke hadde vært der i går.`,
    `${childName} kjente det krible i magen.`,
  ];

  const endings = [
    'Da alt ble stille, blinket et nytt lys langt borte.',
    `${companion} la hodet tett inntil ${childName}, mens mysteriet ventet videre.`,
    'Kartet glødet én gang, og så ble det stille.',
    'Et nytt tegn hadde dukket opp før de rakk å sovne.',
    `${childName} visste at reisen ikke var ferdig ennå.`,
    'Langt borte ventet neste ledetråd.',
    'Natten la seg mykt rundt dem, men eventyret var ikke over.',
    'Noe i mørket glitret vennlig tilbake.',
    `${companion} løftet hodet, som om han hadde hørt noe ingen andre hørte.`,
    'Og et sted der ute våknet neste hemmelighet.',
  ];

  const mysteryStyles = [
    ...interestData.mysteries.map((m) => `La dagens mysterium handle om ${m}.`),
    `Bruk et mysterium knyttet til ${primaryInterest}.`,
    `La en ledetråd dukke opp gjennom ${companion}.`,
    `La ${place} skjule noe nytt.`,
    `La ${color} være en viktig detalj.`,
    `La dagens mysterium bringe dem nærmere ${quest}.`,
  ];

  const authorInstructions = [
    'Skriv som en erfaren norsk barnebokforfatter.',
    'Ikke skriv som en AI-assistent.',
    'Vis følelser gjennom handling, ikke forklar moralen direkte.',
    'Varier åpning og avslutning fra tidligere kapitler.',
    'Bruk sanser: lyd, lys, lukt, bevegelse og små detaljer.',
    'La følgesvennen bidra aktivt.',
    'Gi kapittelet en konkret oppdagelse.',
    'Unngå generiske formuleringer som "de gledet seg til neste eventyr".',
    'Bruk dialog naturlig.',
    'La historien føles som et ekte bokkapittel.',
    'Ikke la nye karakterer gi hele svaret.',
    'La følgesvennen ha egne reaksjoner, små feil og egne meninger.',
    'Unngå replikker som "La oss!", "Ja!" og "Så spennende!".',
    'La mysteriet utvikle seg gradvis.',
  ];

  return {
    opening: pickRandom(openings),
    ending: pickRandom(endings),
    mysteryStyle: pickRandom(mysteryStyles),
    authorInstructions,
  };
}
