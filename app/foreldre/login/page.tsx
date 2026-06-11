'use client';

import { FormEvent, useEffect, useState } from 'react';

export default function ParentLoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [nextPath, setNextPath] = useState('/foreldre');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const emailParam = params.get('email');
    const nextParam = params.get('next');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (
      nextParam &&
      nextParam.startsWith('/') &&
      !nextParam.startsWith('//')
    ) {
      setNextPath(nextParam);
    }
  }, []);

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
      window.location.href = nextPath;
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

          <h1>
            {nextPath === '/start'
              ? 'Start barnets eventyr'
              : 'Foreldreportal'}
          </h1>

          <p>
            {nextPath === '/start'
              ? 'Logg inn med e-post og kode for å fylle ut barnets eventyrprofil.'
              : 'Logg inn for å lese eventyrene og se når neste kapittel kommer.'}
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

              <button className="button" type="submit" disabled={loading}>
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

              <button className="button" type="submit" disabled={loading}>
                {loading ? 'Logger inn...' : 'Logg inn'}
              </button>

              <button
                type="button"
                className="small-btn"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setMessage('');
                  setError('');
                }}
              >
                Bruk en annen e-post
              </button>
            </form>
          )}

          {message && <p className="notice">{message}</p>}

          {error && <p className="error">{error}</p>}
        </section>
      </div>
    </main>
  );
}
