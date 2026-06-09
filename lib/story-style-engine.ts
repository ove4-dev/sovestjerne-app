type StoryStyleInput = {
  childName: string;
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

export function createStoryStyle(input: StoryStyleInput) {
  const childName = clean(input.childName) || 'barnet';
  const interests = clean(input.interests) || 'eventyr';
  const animal = clean(input.favoriteAnimal) || 'følgesvennen';
  const place = clean(input.favoritePlace) || 'et magisk sted';
  const color = clean(input.favoriteColor) || 'gyllen';
  const quest = clean(input.mainQuest) || 'det store mysteriet';

  const openings = [
    `${childName} la merke til noe merkelig ved ${place}.`,
    `Det var noe annerledes med ${place} denne gangen.`,
    `${animal} stoppet plutselig og lyttet.`,
    `Et ${color} lys blinket svakt foran dem.`,
    `${childName} klarte ikke slutte å tenke på ${quest}.`,
    `Noe hadde forandret seg siden forrige eventyr.`,
    `Et lite spor dukket opp der ingen hadde sett før.`,
    `Luften dirret som om et nytt mysterium var på vei.`,
    `${animal} fant noe som ikke hadde vært der i går.`,
    `${childName} kjente det krible i magen.`
  ];

  const endings = [
    `Da alt ble stille, blinket et nytt lys langt borte.`,
    `${animal} la hodet tett inntil ${childName}, mens mysteriet ventet videre.`,
    `Kartet glødet én gang, og så ble det stille.`,
    `Et nytt tegn hadde dukket opp før de rakk å sovne.`,
    `${childName} visste at reisen ikke var ferdig ennå.`,
    `Langt borte ventet neste ledetråd.`,
    `Natten la seg mykt rundt dem, men eventyret var ikke over.`,
    `Noe i mørket glitret vennlig tilbake.`,
    `${animal} løftet hodet, som om han hadde hørt noe ingen andre hørte.`,
    `Og et sted der ute våknet neste hemmelighet.`
  ];

  const mysteryStyles = [
    `Bruk et mysterium knyttet til ${interests}.`,
    `La en ledetråd dukke opp gjennom ${animal}.`,
    `La ${place} skjule noe nytt.`,
    `La ${color} være en viktig detalj.`,
    `La dagens mysterium bringe dem nærmere ${quest}.`
  ];

  const authorInstructions = [
    'Skriv som en erfaren norsk barnebokforfatter.',
    'Ikke skriv som en AI-assistent.',
    'Vis følelser gjennom handling, ikke forklar moralen direkte.',
    'Varier åpning og avslutning fra tidligere kapitler.',
    'Bruk sanser: lyd, lys, lukt, bevegelse og små detaljer.',
    'La følgesvennen bidra aktivt, ikke bare bjeffe, nikke eller logre.',
    'Gi kapittelet en konkret oppdagelse, ikke bare prat.',
    'Unngå generiske formuleringer som “de gledet seg til neste eventyr”.'
  ];

  return {
    opening: pickRandom(openings),
    ending: pickRandom(endings),
    mysteryStyle: pickRandom(mysteryStyles),
    authorInstructions
  };
}
