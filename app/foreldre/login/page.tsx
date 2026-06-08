'use client';

import { FormEvent, useState } from 'react';

export default function ParentLoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    const response = await fetch('/api/parent-login/request-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Kunne ikke sende kode.');
    } else {
      setStep('code');
      setMessage('Vi har sendt deg en kode på e-post.');
    }

    setLoading(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    const response = await fetch('/api/parent-login/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Feil kode.');
    } else {
      window.location.href = '/foreldre';
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

          <p>
            Logg inn for å lese eventyrene og se når neste kapittel kommer.
          </p>
        </section>

        <section className="form">
          {step === 'email' && (
            <form onSubmit={requestCode}>
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

              <button
                className="button"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Sender...' : 'Send kode'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode}>
              <label>
                Kode
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </label>

              <button
                className="button"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Logger inn...' : 'Logg inn'}
              </button>
            </form>
          )}

          {message && (
            <p className="notice">
              {message}
            </p>
          )}

          {error && (
            <p className="error">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
