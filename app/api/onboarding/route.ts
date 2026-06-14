import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type ParentRow = {
  id: string;
  email: string;
};

type ChildRow = {
  id: string;
  parent_email: string | null;
  parent_id: string | null;
  child_name: string | null;
  child_age: number | null;
  favorite_animal: string | null;
  favorite_color: string | null;
  favorite_place: string | null;
  interests: string | null;
  personality: string | null;
  things_to_avoid: string | null;
  dreams: string | null;
  subscription_status: string | null;
  onboarding_completed_at: string | null;
  consent_given: boolean | null;
  consent_given_at: string | null;
  created_at: string;
};

function getCookieValue(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));

  if (!found) return '';

  return decodeURIComponent(found.slice(name.length + 1)).toLowerCase();
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isIncomplete(child: ChildRow) {
  return (
    !child.child_name ||
    child.child_name === 'Ikke utfylt ennå' ||
    !child.child_age ||
    !child.favorite_animal ||
    !child.favorite_color ||
    !child.interests ||
    !child.personality ||
    !child.dreams ||
    !child.onboarding_completed_at ||
    !child.consent_given
  );
}

function uniqueChildren(children: ChildRow[]) {
  const map = new Map<string, ChildRow>();

  for (const child of children) {
    if (child?.id) {
      map.set(child.id, child);
    }
  }

  return Array.from(map.values());
}

function getLoggedInParentEmail(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return getCookieValue(cookieHeader, 'parent_email');
}

async function getParent(email: string) {
  const { data: parent } = await supabaseAdmin
    .from('parents')
    .select('id, email')
    .eq('email', email)
    .maybeSingle<ParentRow>();

  return parent;
}

async function getChildrenForParent(email: string, parentId?: string) {
  const childSelect = `
    id,
    parent_email,
    parent_id,
    child_name,
    child_age,
    favorite_animal,
    favorite_color,
    favorite_place,
    interests,
    personality,
    things_to_avoid,
    dreams,
    subscription_status,
    onboarding_completed_at,
    consent_given,
    consent_given_at,
    created_at
  `;

  const { data: childrenByEmail } = await supabaseAdmin
    .from('children')
    .select(childSelect)
    .eq('parent_email', email)
    .order('created_at', { ascending: false });

  let childrenByParentId: ChildRow[] = [];

  if (parentId) {
    const { data } = await supabaseAdmin
      .from('children')
      .select(childSelect)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    childrenByParentId = (data || []) as ChildRow[];
  }

  return uniqueChildren([
    ...((childrenByEmail || []) as ChildRow[]),
    ...childrenByParentId,
  ]);
}

export async function GET(request: Request) {
  const email = getLoggedInParentEmail(request);

  if (!email) {
    return NextResponse.json({ error: 'Ikke innlogget.' }, { status: 401 });
  }

  const parent = await getParent(email);
  const children = await getChildrenForParent(email, parent?.id);

  if (!children.length) {
    return NextResponse.json(
      { error: 'Fant ingen aktiv kunde på denne e-posten.' },
      { status: 404 }
    );
  }

  const childToOnboard =
    children.find((child) => isIncomplete(child)) || children[0];

  if (parent?.id && !childToOnboard.parent_id) {
    await supabaseAdmin
      .from('children')
      .update({ parent_id: parent.id })
      .eq('id', childToOnboard.id);
  }

  return NextResponse.json({
    child: childToOnboard,
    needsOnboarding: isIncomplete(childToOnboard),
  });
}

export async function POST(request: Request) {
  const email = getLoggedInParentEmail(request);

  if (!email) {
    return NextResponse.json({ error: 'Ikke innlogget.' }, { status: 401 });
  }

  const body = await request.json();

  const childId = cleanText(body.childId);
  const childName = cleanText(body.childName);
  const childAge = Number(body.childAge);
  const favoriteAnimal = cleanText(body.favoriteAnimal);
  const favoriteColor = cleanText(body.favoriteColor);
  const favoritePlace = cleanText(body.favoritePlace);
  const interests = cleanText(body.interests);
  const personality = cleanText(body.personality);
  const thingsToAvoid = cleanText(body.thingsToAvoid);
  const dreams = cleanText(body.dreams);
  const consent = Boolean(body.consent);

  if (!childId) {
    return NextResponse.json({ error: 'Mangler childId.' }, { status: 400 });
  }

  if (!childName) {
    return NextResponse.json({ error: 'Barnets navn mangler.' }, { status: 400 });
  }

  if (!childAge || childAge < 1 || childAge > 14) {
    return NextResponse.json(
      { error: 'Barnets alder må være mellom 1 og 14 år.' },
      { status: 400 }
    );
  }

  if (!favoriteAnimal || !favoriteColor || !interests || !personality || !dreams) {
    return NextResponse.json(
      { error: 'Fyll ut alle nødvendige felt.' },
      { status: 400 }
    );
  }

  if (!consent) {
    return NextResponse.json(
      { error: 'Du må samtykke før profilen kan lagres.' },
      { status: 400 }
    );
  }

  const parent = await getParent(email);
  const children = await getChildrenForParent(email, parent?.id);
  const allowedChild = children.find((child) => child.id === childId);

  if (!allowedChild) {
    return NextResponse.json(
      { error: 'Du har ikke tilgang til denne profilen.' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('children')
    .update({
      parent_email: email,
      parent_id: parent?.id || allowedChild.parent_id || null,
      child_name: childName,
      child_age: childAge,
      favorite_animal: favoriteAnimal,
      favorite_color: favoriteColor,
      favorite_place: favoritePlace,
      interests,
      personality,
      things_to_avoid: thingsToAvoid,
      dreams,
      subscription_status: 'active',
      next_chapter_date: new Date().toISOString().slice(0, 10),
      onboarding_completed_at: now,
      consent_given: true,
      consent_given_at: now,
    })
    .eq('id', childId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke lagre profilen.', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    child: data,
  });
}
