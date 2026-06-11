import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type ParentRow = {
  id: string;
  email: string;
  name?: string | null;
  subscription_status?: string | null;
};

type ChildRow = {
  id: string;
  child_name: string | null;
  parent_email?: string | null;
  parent_id?: string | null;
  next_chapter_date: string | null;
  subscription_status: string | null;
  stories?: unknown[];
};

function getCookieValue(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(';').map((part) => part.trim());

  const found = parts.find((part) => part.startsWith(`${name}=`));

  if (!found) return '';

  return decodeURIComponent(found.slice(name.length + 1)).toLowerCase();
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

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const email = getCookieValue(cookieHeader, 'parent_email');

  if (!email) {
    return NextResponse.json({ error: 'Ikke innlogget.' }, { status: 401 });
  }

  let { data: parent } = await supabaseAdmin
    .from('parents')
    .select('id, email, name, subscription_status')
    .eq('email', email)
    .maybeSingle();

  if (!parent) {
    const { data: existingChild } = await supabaseAdmin
      .from('children')
      .select('id, parent_email, subscription_status')
      .eq('parent_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingChild) {
      return NextResponse.json({ error: 'Fant ikke forelder.' }, { status: 404 });
    }

    const { data: newParent, error: parentCreateError } = await supabaseAdmin
      .from('parents')
      .insert({
        email,
        subscription_status: 'active',
      })
      .select('id, email, name, subscription_status')
      .single();

    if (parentCreateError || !newParent) {
      return NextResponse.json(
        {
          error: 'Kunne ikke opprette forelder.',
          details: parentCreateError,
        },
        { status: 500 }
      );
    }

    parent = newParent;
  }

  const typedParent = parent as ParentRow;

  await supabaseAdmin
    .from('children')
    .update({
      parent_id: typedParent.id,
    })
    .eq('parent_email', email)
    .is('parent_id', null);

  const childSelect = `
    id,
    parent_id,
    parent_email,
    child_name,
    next_chapter_date,
    subscription_status,
    stories (
      id,
      chapter_number,
      title,
      summary,
      status,
      email_status,
      sent_at,
      created_at
    )
  `;

  const { data: childrenByParentId, error: parentIdError } = await supabaseAdmin
    .from('children')
    .select(childSelect)
    .eq('parent_id', typedParent.id)
    .order('created_at', { ascending: false });

  if (parentIdError) {
    return NextResponse.json(
      { error: 'Kunne ikke hente barn via parent_id.', details: parentIdError },
      { status: 500 }
    );
  }

  const { data: childrenByEmail, error: emailError } = await supabaseAdmin
    .from('children')
    .select(childSelect)
    .eq('parent_email', email)
    .order('created_at', { ascending: false });

  if (emailError) {
    return NextResponse.json(
      { error: 'Kunne ikke hente barn via e-post.', details: emailError },
      { status: 500 }
    );
  }

  const children = uniqueChildren([
    ...((childrenByParentId || []) as ChildRow[]),
    ...((childrenByEmail || []) as ChildRow[]),
  ]);

  return NextResponse.json({
    parent: typedParent,
    children,
  });
}
