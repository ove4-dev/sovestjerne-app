import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

type ParentRow = {
  id: string;
  email: string;
};

type ChildRow = {
  id: string;
  parent_email: string | null;
  parent_id: string | null;
  subscription_status: string | null;
};

function cleanEmailValue(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    const cleanEmail = cleanEmailValue(email);
    const cleanCode = String(code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { error: 'E-post og kode må fylles ut.' },
        { status: 400 }
      );
    }

    const { data: loginCode, error } = await supabaseAdmin
      .from('parent_login_codes')
      .select('*')
      .eq('email', cleanEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !loginCode) {
      return NextResponse.json(
        { error: 'Ugyldig eller utløpt kode.' },
        { status: 400 }
      );
    }

    const attempts = Number(loginCode.attempts || 0);

    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'For mange forsøk. Be om ny kode.' },
        { status: 400 }
      );
    }

    if (new Date(loginCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Koden er utløpt. Be om ny kode.' },
        { status: 400 }
      );
    }

    if (String(loginCode.code) !== cleanCode) {
      await supabaseAdmin
        .from('parent_login_codes')
        .update({ attempts: attempts + 1 })
        .eq('id', loginCode.id);

      return NextResponse.json({ error: 'Feil kode.' }, { status: 400 });
    }

    let { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle<ParentRow>();

    const { data: activeChild } = await supabaseAdmin
      .from('children')
      .select('id, parent_email, parent_id, subscription_status')
      .eq('parent_email', cleanEmail)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ChildRow>();

    if (!parent && !activeChild) {
      return NextResponse.json({ error: 'Fant ikke forelder.' }, { status: 404 });
    }

    if (!parent) {
      const { data: newParent, error: parentInsertError } = await supabaseAdmin
        .from('parents')
        .insert({
          email: cleanEmail,
          subscription_status: 'active',
        })
        .select('id, email')
        .single<ParentRow>();

      if (parentInsertError || !newParent) {
        return NextResponse.json(
          {
            error: 'Kunne ikke opprette forelder-login.',
            details: parentInsertError,
          },
          { status: 500 }
        );
      }

      parent = newParent;
    }

    if (activeChild && !activeChild.parent_id) {
      await supabaseAdmin
        .from('children')
        .update({
          parent_id: parent.id,
        })
        .eq('id', activeChild.id);
    }

    await supabaseAdmin
      .from('parent_login_codes')
      .update({ used: true })
      .eq('id', loginCode.id);

    const response = NextResponse.json({
      ok: true,
      message: 'Innlogging godkjent.',
    });

    response.cookies.set('parent_email', cleanEmail, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Noe gikk galt.' }, { status: 500 });
  }
}
