import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const hmacHeader =
      request.headers.get('x-shopify-hmac-sha256') || '';

    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: 'Missing SHOPIFY_WEBHOOK_SECRET' },
        { status: 500 }
      );
    }

    const digest = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (digest !== hmacHeader) {
      return NextResponse.json(
        { error: 'Invalid Shopify signature' },
        { status: 401 }
      );
    }

    const order = JSON.parse(rawBody);

    const email =
      order?.customer?.email ||
      order?.email ||
      null;

    if (!email) {
      return NextResponse.json({
        success: true,
        skipped: 'No customer email',
      });
    }

    const token = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseAdmin
      .from('onboarding_tokens')
      .insert({
        parent_email: email.toLowerCase(),
        token,
        used: false,
        expires_at: expiresAt.toISOString(),
      });

    const onboardingUrl =
      `https://app.sovestjerne.no/start?token=${token}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;">
        <h1>🌙 Velkommen til Sovestjerne</h1>

        <p>
          Takk for bestillingen.
        </p>

        <p>
          Nå trenger vi litt informasjon om barnet ditt før vi kan lage det første eventyret.
        </p>

        <p style="margin:30px 0;">
          <a
            href="${onboardingUrl}"
            style="background:#30a05c;color:white;padding:16px 24px;border-radius:999px;text-decoration:none;font-weight:bold;"
          >
            ✨ Start eventyret
          </a>
        </p>

        <p>
          Hvis knappen ikke virker:
        </p>

        <p>
          <a href="${onboardingUrl}">
            ${onboardingUrl}
          </a>
        </p>
      </div>
    `;

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sovestjerne <onboarding@resend.dev>',
          to: email,
          subject: '🌙 Velkommen til Sovestjerne',
          html,
        }),
      }
    );

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(resendData);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Webhook failed' },
      { status: 500 }
    );
  }
}
