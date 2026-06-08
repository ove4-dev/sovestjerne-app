'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '../../lib/supabaseClient';

type Story = {
  id: string;
  chapter_number: number | null;
  title: string | null;
  summary: string | null;
  status: string | null;
  email_status: string | null;
};

type Child = {
  id: string;
  child_name: string;
  child_age: number | null;
  favorite_animal: string | null;
  favorite_color: string | null;
  interests: string | null;
  next_chapter_date: string | null;
  subscription_status: string | null;
  stories: Story[];
};

export default function ParentPortalPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPortal() {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = '/foreldre/login';
        return;
      }

      const response = await fetch('/api/parent-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Kunne ikke hente foreldreportalen.');
      } else {
        setChildren(result.children || []);
      }

      setLoading(false);
    }

    loadPortal();
  }, []);

  async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = '/foreldre/login';
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="card">
          <section className="success-box">
            <h1>Laster foreldreportalen...</h1>
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
          <h1>Foreldreportalen</h1>
          <p>Her kan du lese kapitler og se når neste eventyr kommer.</p>
        </section>

        <section className="form">
          {error && <p className="error">{error}</p>}

          {children.length === 0 && !error && (
            <p className="notice">Vi fant ingen barn knyttet til denne e-posten ennå.</p>
          )}

          {children.map((child) => {
            const stories = [...(child.stories || [])].sort(
              (a, b) => (a.chapter_number || 0) - (b.chapter_number || 0)
            );

            return (
              <div key={child.id} className="detail-card">
                <h2>{child.child_name}</h2>

                <p>
                  <strong>Alder:</strong> {child.child_age || '-'} år<br />
                  <strong>Status:</strong> {child.subscription_status || 'active'}<br />
                  <strong>Neste kapittel:</strong>{' '}
                  {child.next_chapter_date
                    ? new Date(child.next_chapter_date).toLocaleDateString('nb-NO')
                    : '-'}
                </p>

                <hr />

                <h3>Kapitler</h3>

                {stories.length === 0 ? (
                  <p>Ingen kapitler er klare ennå.</p>
                ) : (
                  stories.map((story) => (
                    <div key={story.id} style={{ marginBottom: '14px' }}>
                      <strong>
                        Kapittel {story.chapter_number}: {story.title || 'Uten tittel'}
                      </strong>
                      <br />

                      {story.summary && <small>{story.summary}</small>}

                      <br />
                      <br />

                      <a
                        className="small-btn"
                        href={`/story/${story.id}`}
                        style={{ display: 'inline-block', textDecoration: 'none' }}
                      >
                        📖 Les kapittel
                      </a>
                    </div>
                  ))
                )}
              </div>
            );
          })}

          <button className="small-btn" type="button" onClick={logout}>
            Logg ut
          </button>
        </section>
      </div>
    </main>
  );
}
