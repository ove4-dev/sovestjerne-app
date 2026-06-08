import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'E-post mangler.' }, { status: 400 });
    }

    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id, email')
      .eq('email', cleanEmail)
      .single();

    if (!parent) {
      return NextResponse.json({
        ok: true,
        message: 'Hvis e-posten finnes, sender vi en kode.',
      });
    }

    const code = generateCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await supabaseAdmin
      .from('parent_login_codes')
      .update({ used: true })
      .eq('email', cleanEmail)
      .eq('used', false);

    const { error: insertError } = await supabaseAdmin
      .from('parent_login_codes')
      .insert({
        email: cleanEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ error: 'Kunne ikke lage kode.' }, { status: 500 });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff8ea;color:#0b1220;">
        <div style="background:#071437;color:white;padding:26px;border-radius:20px;text-align:center;">
          <h1 style="margin:0;">🌙 Sovestjerne</h1>
          <p style="margin:10px 0 0;color:#fff7d7;">Din innloggingskode</p>
        </div>

        <div style="background:white;margin-top:20px;padding:26px;border-radius:20px;border:1px solid #eee;text-align:center;">
          <p>Bruk denne koden for å logge inn i foreldreportalen:</p>

          <div style="font-size:36px;font-weight:bold;letter-spacing:6px;color:#0b1d4f;margin:24px 0;">
            ${code}
          </div>

          <p style="color:#64748b;font-size:14px;">
            Koden er gyldig i 10 minutter.
          </p>
        </div>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sovestjerne <onboarding@resend.dev>',
        to: cleanEmail,
        subject: 'Din innloggingskode til Sovestjerne',
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return NextResponse.json(
        { error: `Resend-feil: ${JSON.stringify(resendData)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Hvis e-posten finnes, sender vi en kode.',
    });
  } catch {
    return NextResponse.json({ error: 'Noe gikk galt.' }, { status: 500 });
  }
}
