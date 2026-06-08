'use client';

import { FormEvent, useState } from 'react';
import { supabaseClient } from '../../../lib/supabaseClient';

export default function ParentLoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://app.sovestjerne.no/foreldre',
      },
    });

    if (error) {
      setError('Kunne ikke sende innloggingslenke.');
    } else {
      setMessage('Sjekk e-posten din. Vi har sendt deg en magisk innloggingslenke.');
    }

    setLoading(false);
  }

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo">
            <span className="star">★</span> Sovestjerne
          </div>
          <h1>Foreldreportal</h1>
          <p>Logg inn for å se barnets eventyr og tidligere kapitler.</p>
        </section>

        <section className="form">
          <form onSubmit={login} style={{ display: 'grid', gap: '16px' }}>
            <label>
              E-post
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.no"
                required
              />
            </label>

            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Sender...' : 'Send innloggingslenke'}
            </button>
          </form>

          {message && <p className="notice">{message}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </div>
    </main>
  );
}
