import { supabaseAdmin } from './supabaseAdmin';

type StyleBankItem = {
  type: string;
  content: string;
  category?: string | null;
};

function pickRandom(items: StyleBankItem[]) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export async function getStoryStyleBank() {
  const { data, error } = await supabaseAdmin
    .from('story_style_bank')
    .select('type, content, category')
    .eq('is_active', true);

  if (error || !data) {
    return {
      opening: null,
      ending: null,
      mystery: null,
      dialog: null,
      twist: null,
    };
  }

  const items = data as StyleBankItem[];

  return {
    opening: pickRandom(items.filter((item) => item.type === 'opening')),
    ending: pickRandom(items.filter((item) => item.type === 'ending')),
    mystery: pickRandom(items.filter((item) => item.type === 'mystery')),
    dialog: pickRandom(items.filter((item) => item.type === 'dialog')),
    twist: pickRandom(items.filter((item) => item.type === 'twist')),
  };
}
