import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json({ error: 'E-post og kode må fylles ut.' }, { status: 400 });
    }

    const { data: loginCode, error } = await supabaseAdmin
      .from('parent_login_codes')
      .select('*')
      .eq('email', cleanEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !loginCode) {
      return NextResponse.json({ error: 'Ugyldig eller utløpt kode.' }, { status: 400 });
    }

    if (loginCode.attempts >= 5) {
      return NextResponse.json({ error: 'For mange forsøk. Be om ny kode.' }, { status: 400 });
    }

    if (new Date(loginCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Koden er utløpt. Be om ny kode.' }, { status: 400 });
    }

    if (loginCode.code !== cleanCode) {
      await supabaseAdmin
        .from('parent_login_codes')
        .update({ attempts: loginCode.attempts + 1 })
        .eq('id', loginCode.id);

      return NextResponse.json({ error: 'Feil kode.' }, { status: 400 });
    }

    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id, email')
      .eq('email', cleanEmail)
      .single();

    if (!parent) {
      return NextResponse.json({ error: 'Fant ikke forelder.' }, { status: 404 });
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
