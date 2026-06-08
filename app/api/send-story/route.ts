import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { storyId } = await request.json();

  if (!storyId) {
    return NextResponse.json({ error: 'Mangler storyId.' }, { status: 400 });
  }

  const { data: story, error: storyError } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: 'Fant ikke historien.' }, { status: 404 });
  }

  if (story.status !== 'approved') {
    return NextResponse.json(
      { error: 'Historien må godkjennes før sending.' },
      { status: 400 }
    );
  }

  const { data: child, error: childError } = await supabaseAdmin
    .from('children')
    .select('child_name,parent_email')
    .eq('id', story.child_id)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Fant ikke barnet.' }, { status: 404 });
  }

  const parentEmail = child.parent_email;
  const childName = child.child_name || 'barnet ditt';

  const storyUrl = `https://app.sovestjerne.no/story/${story.id}`;
  const portalUrl = `https://app.sovestjerne.no/foreldre/login`;
  const subject = `🌙 ${story.title || `Nytt kapittel for ${childName}`}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fff8ea;color:#0b1220;">
      <div style="background:#071437;color:white;padding:28px;border-radius:20px;text-align:center;">
        <h1 style="margin:0;font-size:30px;">🌙 Sovestjerne</h1>
        <p style="margin:10px 0 0;color:#fff7d7;">Ukens eventyr er klart</p>
      </div>

      <div style="background:white;margin-top:20px;padding:26px;border-radius:20px;border:1px solid #eee;">
        <h2 style="margin-top:0;color:#0b1d4f;">${story.title || 'Et nytt eventyr er klart'}</h2>

        <p>Hei!</p>
        <p>Et nytt Sovestjerne-kapittel for <strong>${childName}</strong> er klart.</p>

        <p style="text-align:center;margin:30px 0 16px;">
          <a href="${storyUrl}" style="background:#30a05c;color:white;text-decoration:none;padding:16px 24px;border-radius:999px;font-weight:bold;display:inline-block;">
            ✨ Les eventyret
          </a>
        </p>

        <p style="text-align:center;margin:12px 0 30px;">
          <a href="${portalUrl}" style="background:#071437;color:white;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:bold;display:inline-block;">
            👨‍👩‍👧 Gå til foreldreportalen
          </a>
        </p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;margin-top:18px;">
          <p style="margin:0;color:#92400e;font-weight:bold;">
            I foreldreportalen kan du lese alle kapitler og se når neste eventyr kommer.
          </p>
        </div>

        <p style="color:#64748b;font-size:14px;margin-top:22px;">
          Hvis knappene ikke virker, kan du åpne lenkene her:<br>
          Eventyr: <a href="${storyUrl}">${storyUrl}</a><br>
          Foreldreportal: <a href="${portalUrl}">${portalUrl}</a>
        </p>
      </div>

      <p style="text-align:center;color:#64748b;font-size:13px;margin-top:18px;">
        Sov godt og drøm magisk ✨
      </p>
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
      to: parentEmail,
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

  await supabaseAdmin
    .from('stories')
    .update({
      email_status: 'sent',
      sent_at: new Date().toISOString(),
      email_subject: subject,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId);

  await supabaseAdmin.from('email_logs').insert({
    child_id: story.child_id,
    story_id: story.id,
    recipient_email: parentEmail,
    subject,
    provider_message_id: resendData.id,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    messageId: resendData.id,
  });
}
