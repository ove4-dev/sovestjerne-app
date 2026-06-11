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

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanEmailValue(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cleanEmail = cleanEmailValue(email);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'E-post mangler.' }, { status: 400 });
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
      return NextResponse.json({
        ok: true,
        message: 'Hvis e-posten finnes, sender vi en kode.',
      });
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
            error: 'Kunden finnes, men vi kunne ikke opprette forelder-login.',
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
        used: false,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Kunne ikke lage kode.', details: insertError },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://sovestjerne-app.vercel.app';

    const startUrl = `${appUrl}/foreldre/login?next=/start`;

    const subject = 'Din innloggingskode til Sovestjerne';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff8ea;color:#0b1220;">
        <div style="background:#071437;color:white;padding:26px;border-radius:20px;text-align:center;">
          <h1 style="margin:0;">🌙 Sovestjerne</h1>
          <p style="margin:10px 0 0;color:#fff7d7;">Din innloggingskode</p>
        </div>

        <div style="background:white;margin-top:20px;padding:26px;border-radius:20px;border:1px solid #eee;text-align:center;">
          <p>Bruk denne koden for å logge inn og fylle ut barnets eventyrprofil:</p>

          <div style="font-size:36px;font-weight:bold;letter-spacing:6px;color:#0b1d4f;margin:24px 0;">
            ${code}
          </div>

          <p style="text-align:center;margin:28px 0;">
            <a href="${startUrl}" style="background:#30a05c;color:white;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:bold;display:inline-block;">
              ✨ Gå til start
            </a>
          </p>

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
        from: 'Sovestjerne <eventyr@sovestjerne.no>',
        to: cleanEmail,
        subject,
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

    if (activeChild?.id) {
      await supabaseAdmin.from('email_logs').insert({
        child_id: activeChild.id,
        story_id: null,
        recipient_email: cleanEmail,
        subject,
        provider_message_id: resendData.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Hvis e-posten finnes, sender vi en kode.',
    });
  } catch {
    return NextResponse.json({ error: 'Noe gikk galt.' }, { status: 500 });
  }
}
