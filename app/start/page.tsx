'use client';

import { FormEvent, useEffect, useState } from 'react';

type ChildProfile = {
  id: string;
  child_name: string | null;
  child_age: number | null;
  favorite_animal: string | null;
  favorite_color: string | null;
  favorite_place: string | null;
  interests: string | null;
  personality: string | null;
  things_to_avoid: string | null;
  dreams: string | null;
};

export default function StartPage() {
  const [child, setChild] = useState<ChildProfile | null>(null);

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [favoriteAnimal, setFavoriteAnimal] = useState('');
  const [favoriteColor, setFavoriteColor] = useState('');
  const [favoritePlace, setFavoritePlace] = useState('');
  const [interests, setInterests] = useState('');
  const [personality, setPersonality] = useState('');
  const [thingsToAvoid, setThingsToAvoid] = useState('');
  const [dreams, setDreams] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadOnboarding() {
      setLoading(true);
      setError('');

      const response = await fetch('/api/onboarding');
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/foreldre/login?next=/start';
          return;
        }

        setError(result.error || 'Kunne ikke hente onboarding.');
        setLoading(false);
        return;
      }

      const loadedChild = result.child as ChildProfile;

      setChild(loadedChild);

      setChildName(
        loadedChild.child_name && loadedChild.child_name !== 'Ikke utfylt ennå'
          ? loadedChild.child_name
          : ''
      );

      setChildAge(loadedChild.child_age ? String(loadedChild.child_age) : '');
      setFavoriteAnimal(loadedChild.favorite_animal || '');
      setFavoriteColor(loadedChild.favorite_color || '');
      setFavoritePlace(loadedChild.favorite_place || '');
      setInterests(loadedChild.interests || '');
      setPersonality(loadedChild.personality || '');
      setThingsToAvoid(loadedChild.things_to_avoid || '');
      setDreams(loadedChild.dreams || '');

      setLoading(false);
    }

    loadOnboarding();
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    if (!child) return;

    setSaving(true);
    setError('');
    setMessage('');

    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        childId: child.id,
        childName,
        childAge,
        favoriteAnimal,
        favoriteColor,
        favoritePlace,
        interests,
        personality,
        thingsToAvoid,
        dreams,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Kunne ikke lagre profilen.');
      setSaving(false);
      return;
    }

    setMessage('Profilen er lagret. Vi sender deg videre til foreldreportalen.');

    setTimeout(() => {
      window.location.href = '/foreldre';
    }, 900);
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="card">
          <section className="header">
            <div className="logo">
              <span className="star">★</span> Sovestjerne
            </div>

            <h1>Laster...</h1>

            <p>Vi finner profilen din.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo">
            <span className="star">★</span> Sovestjerne
          </div>

          <h1>Start barnets eventyr</h1>

          <p>
            Fyll ut barnets profil, så kan vi lage en personlig godnatthistorie
            med navn, interesser, favorittdyr og riktig eventyrfølelse.
          </p>
        </section>

        <form className="form" onSubmit={saveProfile}>
          {error && <div className="error">{error}</div>}

          {message && <div className="notice">{message}</div>}

          <h2 className="section-title">Barnet</h2>

          <div className="grid">
            <label>
              Barnets navn
              <input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="For eksempel Sander"
                required
              />
            </label>

            <label>
              Alder
              <input
                type="number"
                min="1"
                max="14"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                placeholder="7"
                required
              />
            </label>
          </div>

          <div className="grid">
            <label>
              Favorittdyr
              <input
                value={favoriteAnimal}
                onChange={(e) => setFavoriteAnimal(e.target.value)}
                placeholder="Hund, katt, dinosaur..."
                required
              />
            </label>

            <label>
              Favorittfarge
              <input
                value={favoriteColor}
                onChange={(e) => setFavoriteColor(e.target.value)}
                placeholder="Blå, rød, lilla..."
                required
              />
            </label>
          </div>

          <label>
            Favorittsted
            <span className="help">
              Et sted historien gjerne kan bruke.
            </span>
            <input
              value={favoritePlace}
              onChange={(e) => setFavoritePlace(e.target.value)}
              placeholder="Skogen, sjøen, racerbanen, rommet..."
            />
          </label>

          <label>
            Hva liker barnet?
            <span className="help">
              Skriv gjerne flere ting. For eksempel: biler, dinosaurer, hunder,
              havet, fotball, prinsesser, romskip.
            </span>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Barnet liker..."
              required
            />
          </label>

          <label>
            Hvordan er barnet?
            <span className="help">
              For eksempel nysgjerrig, modig, forsiktig, morsom, energisk,
              kreativ.
            </span>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Barnet er..."
              required
            />
          </label>

          <label>
            Hva bør historien unngå?
            <span className="help">
              For eksempel: ikke skummelt, ikke monstre, ikke høye lyder.
            </span>
            <textarea
              value={thingsToAvoid}
              onChange={(e) => setThingsToAvoid(e.target.value)}
              placeholder="Unngå..."
            />
          </label>

          <label>
            Hva drømmer barnet om?
            <span className="help">
              Dette hjelper oss å lage en historie som føles personlig.
            </span>
            <textarea
              value={dreams}
              onChange={(e) => setDreams(e.target.value)}
              placeholder="Barnet drømmer om..."
              required
            />
          </label>

          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Lagrer...' : 'Lagre og start eventyret'}
          </button>
        </form>
      </div>
    </main>
  );
}
