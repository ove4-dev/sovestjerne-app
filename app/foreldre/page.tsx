'use client';

import { useEffect, useState } from 'react';

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
      const response = await fetch('/api/parent-data');
      const result = await response.json();

      if (!response.ok) {
        window.location.href = '/foreldre/login';
        return;
      }

      setChildren(result.children || []);
      setLoading(false);
    }

    loadPortal();
  }, []);

  async function logout() {
    document.cookie = 'parent_email=; Max-Age=0; path=/';
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

                      {story.summary && (
                        <>
                          <br />
                          <small>{story.summary}</small>
                        </>
                      )}

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
