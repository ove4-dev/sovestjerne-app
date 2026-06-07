import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = request.headers.get('x-admin-password');

  if (!adminPassword || provided !== adminPassword) {
    return NextResponse.json({ error: 'Ikke tilgang.' }, { status: 401 });
  }

  const { data: children, error } = await supabaseAdmin
    .from('children')
    .select(`
      id,
      created_at,
      parent_id,
      parent_email,
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
      subscription_started_at,
      next_chapter_date,
      last_chapter_sent_at,
      story_bibles (
        universe_name,
        companion_name,
        companion_type,
        story_goal,
        current_chapter,
        memory
      ),
      stories (
        id,
        created_at,
        chapter_number,
        title,
        story_text,
        summary,
        status,
        email_status,
        sent_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Kunne ikke hente data.', details: error },
      { status: 500 }
    );
  }

  const childrenWithSubscriptions = await Promise.all(
    (children || []).map(async (child) => {
      let subscription = null;

      if (child.parent_id) {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select(`
            id,
            status,
            shopify_customer_id,
            shopify_subscription_id,
            current_period_start,
            current_period_end,
            next_billing_date
          `)
          .eq('parent_id', child.parent_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        subscription = sub;
      }

      return {
        ...child,
        subscription,
      };
    })
  );

  return NextResponse.json({ children: childrenWithSubscriptions });
}
