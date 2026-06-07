import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function pickUniverse(interests: string[], favoriteAnimal?: string) {
  const lower = interests.join(' ').toLowerCase();
  if (lower.includes('verdensrommet')) return 'Stjerneskogen';
  if (lower.includes('dinosaur')) return 'Dinoøya';
  if (lower.includes('havfrue')) return 'Korallriket';
  if (lower.includes('hest')) return 'Måneenga';
  if (lower.includes('pirat')) return 'Piratbukta';
  if (favoriteAnimal) return 'Dyreskogen';
  return 'Stjerneskogen';
}

function companionFromAnimal(animal?: string) {
  const a = (animal || '').toLowerCase();
  if (a.includes('hund')) return { name: 'Nova', type: 'hund' };
  if (a.includes('hest')) return { name: 'Mira', type: 'hest' };
  if (a.includes('katt')) return { name: 'Milo', type: 'katt' };
  if (a.includes('panda')) return { name: 'Luna', type: 'panda' };
  if (a.includes('rev')) return { name: 'Pip', type: 'rev' };
  return { name: 'Nova', type: animal || 'stjernehund' };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parentEmail = String(body.parentEmail || '').trim().toLowerCase();
    const parentName = String(body.parentName || '').trim();
    const childName = String(body.childName || '').trim();
    const childAge = Number(body.childAge || 0);
    const favoriteAnimal = String(body.favoriteAnimal || '').trim();
    const favoriteColor = String(body.favoriteColor || '').trim();
    const favoritePlace = String(body.favoritePlace || '').trim();
    const interests = asTextArray(body.interests);
    const personality = asTextArray(body.personality);
    const thingsToAvoid = asTextArray(body.thingsToAvoid);
    const dreams = String(body.dreams || '').trim();

    if (!parentEmail || !childName || !childAge) {
      return NextResponse.json({ error: 'E-post, barnets navn og alder må fylles ut.' }, { status: 400 });
    }

    const { data: parent, error: parentError } = await supabaseAdmin
      .from('parents')
      .upsert({ email: parentEmail, name: parentName, subscription_status: 'pending' }, { onConflict: 'email' })
      .select('id')
      .single();

    if (parentError || !parent) throw parentError || new Error('Kunne ikke lagre forelder.');

    const { data: child, error: childError } = await supabaseAdmin
      .from('children')
      .insert({
        parent_id: parent.id,
        parent_email: parentEmail,
        child_name: childName,
        child_age: childAge,
        favorite_animal: favoriteAnimal,
        favorite_color: favoriteColor,
        favorite_place: favoritePlace,
        interests: interests.join(', '),
        personality: personality.join(', '),
        things_to_avoid: thingsToAvoid.join(', '),
        dreams,
      })
      .select('id')
      .single();

    if (childError || !child) throw childError || new Error('Kunne ikke lagre barnet.');

    const universe = pickUniverse(interests, favoriteAnimal);
    const companion = companionFromAnimal(favoriteAnimal);

    const { error: bibleError } = await supabaseAdmin.from('story_bibles').insert({
      child_id: child.id,
      universe_name: universe,
      main_character: childName,
      companion_name: companion.name,
      companion_type: companion.type,
      story_goal: `Finne de syv drømmestjernene sammen med ${companion.name}.`,
      current_chapter: 1,
      memory: `${childName} er ${childAge} år. Barnet liker ${interests.join(', ') || 'eventyr'}${favoriteAnimal ? ` og favorittdyret er ${favoriteAnimal}` : ''}. Eventyret starter i ${universe}.`,
    });

    if (bibleError) throw bibleError;

    return NextResponse.json({ ok: true, childId: child.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Kunne ikke lagre eventyrprofilen akkurat nå.' }, { status: 500 });
  }
}
