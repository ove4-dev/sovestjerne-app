'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const interests = ['Dyr', 'Magi', 'Verdensrommet', 'Dinosaurer', 'Hester', 'Fotball', 'Eventyr', 'Pirater', 'Prinsesser', 'Havfruer', 'Biler', 'Tog'];
const personalities = ['Modig', 'Snill', 'Nysgjerrig', 'Kreativ', 'Hjelpsom', 'Eventyrlysten', 'Morsom', 'Rolig'];
const avoid = ['Skumle ting', 'Mørke skoger', 'Spøkelser', 'Drager', 'Høye lyder', 'Triste avslutninger'];
function StartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenOk, setTokenOk] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
  const [selectedAvoid, setSelectedAvoid] = useState<string[]>([]);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setTokenOk(false);
        setTokenError('Denne lenken er ikke gyldig. Kjøp abonnement først.');
        setCheckingToken(false);
        return;
      }

      const response = await fetch(`/api/onboarding-token?token=${encodeURIComponent(token)}`);
      const result = await response.json();

      if (!response.ok) {
        setTokenOk(false);
        setTokenError(result.error || 'Denne lenken er ikke gyldig.');
      } else {
        setTokenOk(true);
      }

      setCheckingToken(false);
    }

    checkToken();
  }, [token]);

  function toggle(value: string, list: string[], setList: (v: string[]) => void, max?: number) {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    if (max && list.length >= max) return;
    setList([...list, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      token,
      parentEmail: String(form.get('parentEmail') || '').trim(),
      parentName: String(form.get('parentName') || '').trim(),
      childName: String(form.get('childName') || '').trim(),
      childAge: Number(form.get('childAge') || 0),
      favoriteAnimal: String(form.get('favoriteAnimal') || '').trim(),
      favoriteColor: String(form.get('favoriteColor') || '').trim(),
      favoritePlace: String(form.get('favoritePlace') || '').trim(),
      interests: selectedInterests,
      personality: selectedPersonality,
      thingsToAvoid: selectedAvoid,
      dreams: String(form.get('dreams') || '').trim(),
    };

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Noe gikk galt. Prøv igjen.');
      router.push('/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingToken) {
    return (
      <main className="page-shell">
        <div className="card">
          <section className="success-box">
            <h1>Sjekker lenken...</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!tokenOk) {
    return (
      <main className="page-shell">
        <div className="card">
          <section className="header">
            <div className="logo"><span className="star">★</span> Sovestjerne</div>
            <h1>Lenken er ikke gyldig</h1>
            <p>{tokenError}</p>
          </section>

          <section className="success-box">
            <p>For å starte barnets eventyr må abonnementet kjøpes først.</p>
            <a className="button" href="https://sovestjerne.no" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Gå til Sovestjerne
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo"><span className="star">★</span> Sovestjerne</div>
          <h1>La oss bli kjent med barnet ditt</h1>
          <p>Fortell litt om barnet, så kan vi skape et personlig eventyrunivers som utvikler seg uke etter uke.</p>
        </section>

        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}

          <div className="notice">✨ Første kapittel sendes kl. 17. Bestiller du etter kl. 12, sendes første kapittel neste leveringsdag.</div>

          <h2 className="section-title">Forelder</h2>
          <div className="grid">
            <label>Din e-post
              <input name="parentEmail" type="email" placeholder="din@email.no" required />
            </label>
            <label>Ditt navn
              <input name="parentName" placeholder="F.eks. Maria" />
            </label>
          </div>

          <h2 className="section-title">Barnet</h2>
          <div className="grid">
            <label>Barnets navn
              <input name="childName" placeholder="F.eks. Amanda" required />
            </label>
            <label>Alder
              <select name="childAge" required defaultValue="">
                <option value="" disabled>Velg alder</option>
                {[3,4,5,6,7,8,9,10].map((age) => <option key={age} value={age}>{age} år</option>)}
              </select>
            </label>
          </div>

          <h2 className="section-title">Favoritter</h2>
          <div className="grid">
            <label>Favorittdyr
              <input name="favoriteAnimal" placeholder="F.eks. hund, hest, panda" />
            </label>
            <label>Favorittfarge
              <input name="favoriteColor" placeholder="F.eks. lilla" />
            </label>
            <label>Favorittsted
              <input name="favoritePlace" placeholder="F.eks. skogen, havet, verdensrommet" />
            </label>
          </div>

          <h2 className="section-title">Interesser <span className="help">velg opptil 5</span></h2>
          <div className="check-grid">
            {interests.map((item) => (
              <label className="check" key={item}>
                <input type="checkbox" checked={selectedInterests.includes(item)} onChange={() => toggle(item, selectedInterests, setSelectedInterests, 5)} />
                {item}
              </label>
            ))}
          </div>

          <h2 className="section-title">Personlighet <span className="help">velg opptil 3</span></h2>
          <div className="check-grid">
            {personalities.map((item) => (
              <label className="check" key={item}>
                <input type="checkbox" checked={selectedPersonality.includes(item)} onChange={() => toggle(item, selectedPersonality, setSelectedPersonality, 3)} />
                {item}
              </label>
            ))}
          </div>

          <h2 className="section-title">Ting vi bør unngå</h2>
          <div className="check-grid">
            {avoid.map((item) => (
              <label className="check" key={item}>
                <input type="checkbox" checked={selectedAvoid.includes(item)} onChange={() => toggle(item, selectedAvoid, setSelectedAvoid)} />
                {item}
              </label>
            ))}
          </div>

          <label>Hva drømmer barnet om?
            <textarea name="dreams" placeholder="Skriv gjerne litt ekstra. F.eks. elsker hunder, liker verdensrommet, vil gjerne være modig..." />
          </label>

          <button className="button" type="submit" disabled={loading}>{loading ? 'Lagrer...' : '✨ Lagre og start eventyret'}</button>
        </form>
      </div>
    </main>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <StartPageContent />
    </Suspense>
  );
}
