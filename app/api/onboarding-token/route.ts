import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Mangler token.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('onboarding_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Denne lenken er ikke gyldig.' },
      { status: 404 }
    );
  }

  if (data.used) {
    return NextResponse.json(
      { error: 'Denne lenken er allerede brukt.' },
      { status: 400 }
    );
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Denne lenken har utløpt.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: data.parent_email,
  });
}
