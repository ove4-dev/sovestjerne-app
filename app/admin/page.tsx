'use client';

import { FormEvent, useState } from 'react';

type StoryBible = {
  universe_name: string | null;
  companion_name: string | null;
  companion_type: string | null;
  story_goal: string | null;
  current_chapter: number | null;
  memory: string | null;
};

type Story = {
  id: string;
  created_at: string;
  chapter_number: number | null;
  title: string | null;
  story_text: string | null;
  summary: string | null;
  status: string | null;
  email_status: string | null;
  sent_at: string | null;
};

type ChildRow = {
  id: string;
  created_at: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  favorite_animal: string | null;
  favorite_color: string | null;
  interests: string | null;
  story_bibles?: StoryBible[];
  stories?: Story[];
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin', {
        headers: { 'x-admin-password': password },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Feil passord eller feil i systemet.');
      }

      setRows(result.children || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setLoading(false);
    }
  }

  async function generateStoryBible(childId: string) {
    setError('');
    setMessage('');
    setGeneratingId(childId);

    try {
      const response = await fetch('/api/generate-story-bible', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ childId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke generere Story Bible.');
      }

      setMessage('Story Bible ble generert og lagret.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setGeneratingId(null);
    }
  }

  async function generateChapter(childId: string) {
    setError('');
    setMessage('');
    setGeneratingId(childId);

    try {
      const response = await fetch('/api/generate-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ childId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke generere kapittel.');
      }

      setMessage('Kapittel ble generert og lagret.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setGeneratingId(null);
    }
  }

  async function approveStory(storyId: string) {
    setError('');
    setMessage('');
    setApprovingId(storyId);

    try {
      const response = await fetch('/api/approve-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke godkjenne historien.');
      }

      setMessage('Historien ble godkjent.');

      setSelectedStory((current) =>
        current && current.id === storyId ? { ...current, status: 'approved' } : current
      );

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setApprovingId(null);
    }
  }

  async function sendStory(storyId: string) {
    setError('');
    setMessage('');
    setSendingId(storyId);

    try {
      const response = await fetch('/api/send-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke sende historien.');
      }

      setMessage('Historien ble sendt på e-post.');

      setSelectedStory((current) =>
        current && current.id === storyId
          ? { ...current, email_status: 'sent', sent_at: new Date().toISOString() }
          : current
      );

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setSendingId(null);
    }
  }

  function openLatestStory(row: ChildRow) {
    const stories = row.stories || [];
    const latest = [...stories].sort(
      (a, b) => (b.chapter_number || 0) - (a.chapter_number || 0)
    )[0];

    if (!latest) {
      setError('Ingen kapittel er generert for dette barnet ennå.');
      return;
    }

    setError('');
    setSelectedChild(row.child_name);
    setSelectedStory(latest);
  }

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h1>🌙 Sovestjerne admin</h1>
        <p>Se eventyrprofiler, generer, godkjenn og send kapitler.</p>

        <form className="admin-login" onSubmit={load}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin-passord"
          />

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Laster...' : 'Åpne admin'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {message && <p className="notice">{message}</p>}

        {selectedStory && (
          <div className="detail-card">
            <h2>
              {selectedChild} – {selectedStory.title || 'Uten tittel'}
            </h2>

            <p>
              <strong>Kapittel:</strong> {selectedStory.chapter_number || '-'} <br />
              <strong>Status:</strong> {selectedStory.status || '-'} <br />
              <strong>E-post:</strong> {selectedStory.email_status || '-'}
            </p>

            {selectedStory.summary && (
              <p>
                <strong>Oppsummering:</strong> {selectedStory.summary}
              </p>
            )}

            <hr />

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
              {selectedStory.story_text}
            </div>

            <br />

            {selectedStory.status !== 'approved' && (
              <>
                <button
                  className="small-btn"
                  type="button"
                  onClick={() => approveStory(selectedStory.id)}
                  disabled={approvingId === selectedStory.id}
                >
                  {approvingId === selectedStory.id ? 'Godkjenner...' : '✅ Godkjenn historie'}
                </button>

                <br />
                <br />
              </>
            )}

            {selectedStory.status === 'approved' && selectedStory.email_status !== 'sent' && (
              <>
                <p className="notice">✅ Denne historien er godkjent og klar til sending.</p>

                <button
                  className="small-btn"
                  type="button"
                  onClick={() => sendStory(selectedStory.id)}
                  disabled={sendingId === selectedStory.id}
                >
                  {sendingId === selectedStory.id ? 'Sender...' : '📩 Send historie'}
                </button>

                <br />
                <br />
              </>
            )}

            {selectedStory.email_status === 'sent' && (
              <p className="notice">📩 Denne historien er sendt.</p>
            )}

            <button className="small-btn" type="button" onClick={() => setSelectedStory(null)}>
              Lukk historie
            </button>
          </div>
        )}

        {rows.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dato</th>
                <th>Forelder</th>
                <th>Barn</th>
                <th>Favoritter</th>
                <th>Interesser</th>
                <th>Story Bible</th>
                <th>Siste kapittel</th>
                <th>Handling</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const bible = row.story_bibles?.[0];
                const stories = row.stories || [];
                const latestStory = [...stories].sort(
                  (a, b) => (b.chapter_number || 0) - (a.chapter_number || 0)
                )[0];

                return (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleDateString('nb-NO')}</td>
                    <td>{row.parent_email}</td>

                    <td>
                      <strong>{row.child_name}</strong>
                      <br />
                      {row.child_age} år
                    </td>

                    <td>
                      {row.favorite_animal || '-'}
                      <br />
                      {row.favorite_color || '-'}
                    </td>

                    <td>{row.interests || '-'}</td>

                    <td>
                      {bible ? (
                        <>
                          <strong>{bible.universe_name || '-'}</strong>
                          <br />
                          Følgesvenn: {bible.companion_name || '-'}
                          <br />
                          Kapittel: {bible.current_chapter || 1}
                          <br />
                          <small>{bible.story_goal || ''}</small>
                        </>
                      ) : (
                        <span>Ikke generert</span>
                      )}
                    </td>

                    <td>
                      {latestStory ? (
                        <>
                          <strong>{latestStory.title || 'Uten tittel'}</strong>
                          <br />
                          Kapittel {latestStory.chapter_number || '-'}
                          <br />
                          Status: {latestStory.status || '-'}
                          <br />
                          E-post: {latestStory.email_status || '-'}
                        </>
                      ) : (
                        'Ingen kapittel'
                      )}
                    </td>

                    <td>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => generateStoryBible(row.id)}
                        disabled={generatingId === row.id}
                      >
                        {generatingId === row.id
                          ? 'Jobber...'
                          : bible
                            ? 'Generer Story Bible på nytt'
                            : 'Generer Story Bible'}
                      </button>

                      <br />
                      <br />

                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => generateChapter(row.id)}
                        disabled={generatingId === row.id || !bible}
                      >
                        {generatingId === row.id ? 'Jobber...' : 'Generer kapittel'}
                      </button>

                      <br />
                      <br />

                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => openLatestStory(row)}
                        disabled={!latestStory}
                      >
                        Les siste kapittel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
