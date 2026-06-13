import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type ShopifyOrder = {
  id?: string | number;
  name?: string;
  order_number?: string | number;
  email?: string | null;
  contact_email?: string | null;
  financial_status?: string | null;
  cancelled_at?: string | null;
  customer?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type ParentRow = {
  id: string;
  email: string;
};

type ChildRow = {
  id: string;
  parent_email: string | null;
  shopify_order_id: string | null;
  onboarding_email_sent_at: string | null;
};

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function getOsloHour(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');

  return hour === 24 ? 0 : hour;
}

function formatOsloDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

function getFirstChapterDate() {
  const now = new Date();
  const osloHour = getOsloHour(now);

  if (osloHour < 12) {
    return formatOsloDate(now);
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return formatOsloDate(tomorrow);
}

function getOrderEmail(order: ShopifyOrder) {
  return cleanEmail(
    order.email ||
      order.contact_email ||
      order.customer?.email ||
      ''
  );
}

function getOrderId(order: ShopifyOrder) {
  return String(order.id || '').trim();
}

function verifyShopifyHmac({
  rawBody,
  hmacHeader,
  secret,
}: {
  rawBody: string;
  hmacHeader: string;
  secret: string;
}) {
  const digest = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const digestBuffer = Buffer.from(digest, 'utf8');
  const hmacBuffer = Buffer.from(hmacHeader, 'utf8');

  if (digestBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, hmacBuffer);
}

function shouldProcessOrder(order: ShopifyOrder) {
  const financialStatus = String(order.financial_status || '').toLowerCase();

  if (order.cancelled_at) {
    return false;
  }

  if (financialStatus === 'refunded' || financialStatus === 'voided') {
    return false;
  }

  if (
    financialStatus &&
    financialStatus !== 'paid' &&
    financialStatus !== 'authorized' &&
    financialStatus !== 'partially_paid'
  ) {
    return false;
  }

  return true;
}

async function getOrCreateParent(parentEmail: string) {
  const { data: existingParent } = await supabaseAdmin
    .from('parents')
    .select('id, email')
    .eq('email', parentEmail)
    .maybeSingle();

  if (existingParent) {
    return existingParent as ParentRow;
  }

  const { data: newParent, error } = await supabaseAdmin
    .from('parents')
    .insert({
      email: parentEmail,
      subscription_status: 'active',
    })
    .select('id, email')
    .single();

  if (error || !newParent) {
    throw new Error(`Kunne ikke opprette parent: ${JSON.stringify(error)}`);
  }

  return newParent as ParentRow;
}

async function sendWelcomeEmail({
  parentEmail,
  childId,
}: {
  parentEmail: string;
  childId: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sovestjerne.no';

  const startUrl = `${appUrl}/foreldre/login?next=/start`;

  const subject = '🌙 Velkommen til Sovestjerne – start barnets eventyr';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fff8ea;color:#0b1220;">
      <div style="background:#071437;color:white;padding:30px;border-radius:22px;text-align:center;">
        <h1 style="margin:0;font-size:32px;">🌙 Sovestjerne</h1>
        <p style="margin:12px 0 0;color:#fff7d7;font-size:17px;">
          Barnets personlige godnatthistorie starter her
        </p>
      </div>

      <div style="background:white;margin-top:20px;padding:28px;border-radius:22px;border:1px solid #eee;">
        <h2 style="margin-top:0;color:#0b1d4f;">
          Velkommen til Sovestjerne!
        </h2>

        <p>Hei!</p>

        <p>
          Takk for bestillingen. Nå trenger vi bare litt informasjon om barnet,
          slik at vi kan lage en personlig godnatthistorie med riktig navn,
          interesser, favorittdyr og eventyrstil.
        </p>

        <p>
          Trykk på knappen under. Du logger inn med e-posten du brukte ved kjøp,
          får en engangskode på e-post, og kommer deretter til skjemaet hvor du
          fyller ut barnets eventyrprofil.
        </p>

        <p style="text-align:center;margin:32px 0;">
          <a href="${startUrl}" style="background:#30a05c;color:white;text-decoration:none;padding:16px 26px;border-radius:999px;font-weight:bold;display:inline-block;">
            ✨ Start barnets eventyr
          </a>
        </p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;margin-top:18px;">
          <p style="margin:0;color:#92400e;font-weight:bold;">
            Etter at profilen er fylt ut, kan første personlige kapittel lages.
          </p>
        </div>

        <p style="color:#64748b;font-size:14px;margin-top:24px;">
          Hvis knappen ikke virker, kan du åpne denne lenken:<br>
          <a href="${startUrl}">${startUrl}</a>
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
      from: 'Sovestjerne <eventyr@sovestjerne.no>',
      to: parentEmail,
      subject,
      html,
    }),
  });

  const resendData = await resendResponse.json();

  if (!resendResponse.ok) {
    throw new Error(`Resend-feil: ${JSON.stringify(resendData)}`);
  }

  await supabaseAdmin.from('email_logs').insert({
    child_id: childId,
    story_id: null,
    recipient_email: parentEmail,
    subject,
    provider_message_id: resendData.id,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });

  return String(resendData.id || '');
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256') || '';
    const topic = request.headers.get('x-shopify-topic') || '';
    const webhookId = request.headers.get('x-shopify-webhook-id') || '';

    if (!shopifySecret) {
      return NextResponse.json(
        { error: 'SHOPIFY_WEBHOOK_SECRET mangler.' },
        { status: 500 }
      );
    }

    const validHmac = verifyShopifyHmac({
      rawBody,
      hmacHeader,
      secret: shopifySecret,
    });

    if (!validHmac) {
      return NextResponse.json(
        { error: 'Invalid Shopify signature' },
        { status: 401 }
      );
    }

    const order = JSON.parse(rawBody) as ShopifyOrder;

    const parentEmail = getOrderEmail(order);
    const shopifyOrderId = getOrderId(order);
    const financialStatus = String(order.financial_status || '').toLowerCase();

    if (!shopifyOrderId) {
      return NextResponse.json(
        { error: 'Shopify order mangler id.' },
        { status: 400 }
      );
    }

    if (!parentEmail || !parentEmail.includes('@')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Ordren mangler e-post.',
        shopifyOrderId,
        topic,
      });
    }

    if (!shouldProcessOrder(order)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Ordren er ikke betalt, eller er kansellert/refundert/voided.',
        shopifyOrderId,
        parentEmail,
        financialStatus,
        topic,
      });
    }

    const { data: existingChild } = await supabaseAdmin
      .from('children')
      .select('id, parent_email, shopify_order_id, onboarding_email_sent_at')
      .eq('shopify_order_id', shopifyOrderId)
      .maybeSingle();

    const typedExistingChild = existingChild as ChildRow | null;

    if (typedExistingChild?.onboarding_email_sent_at) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        childId: typedExistingChild.id,
        parentEmail,
        shopifyOrderId,
        topic,
      });
    }

    const parent = await getOrCreateParent(parentEmail);

    let childId: string | null = typedExistingChild?.id ?? null;
    let firstChapterDate = getFirstChapterDate();

    if (!childId) {
      const now = new Date().toISOString();
      firstChapterDate = getFirstChapterDate();

      const { data: newChild, error: childError } = await supabaseAdmin
        .from('children')
        .insert({
          parent_email: parentEmail,
          parent_id: parent.id,
          child_name: 'Ikke utfylt ennå',
          child_age: null,
          favorite_animal: null,
          favorite_color: null,
          favorite_place: null,
          interests: null,
          personality: null,
          things_to_avoid: null,
          dreams: null,
          subscription_status: 'active',
          subscription_started_at: now,
          next_chapter_date: firstChapterDate,
          last_chapter_sent_at: null,
          onboarding_completed_at: null,
          onboarding_email_sent_at: null,
          shopify_order_id: shopifyOrderId,
          shopify_webhook_id: webhookId || null,
          created_at: now,
        })
        .select('id')
        .single();

      if (childError || !newChild?.id) {
        throw new Error(`Kunne ikke opprette child: ${JSON.stringify(childError)}`);
      }

      childId = String(newChild.id);
    }

    if (!childId) {
      throw new Error('Mangler childId etter opprettelse av kunde.');
    }

    const messageId = await sendWelcomeEmail({
      parentEmail,
      childId,
    });

    await supabaseAdmin
      .from('children')
      .update({
        onboarding_email_sent_at: new Date().toISOString(),
        shopify_webhook_id: webhookId || null,
      })
      .eq('id', childId);

    return NextResponse.json({
      success: true,
      childId,
      parentEmail,
      shopifyOrderId,
      financialStatus,
      topic,
      firstChapterDate,
      messageId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook failed',
      },
      { status: 500 }
    );
  }
}
