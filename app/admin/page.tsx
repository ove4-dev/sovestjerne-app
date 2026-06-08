'use client';

import { FormEvent, useState } from 'react';

type StoryImage = {
  id: string;
  prompt: string | null;
  image_url: string | null;
  status: string | null;
  generation_status: string | null;
  created_at?: string | null;
  approved_at?: string | null;
};

type StoryBible = {
  universe_name: string | null;
  companion_name: string | null;
  companion_type: string | null;
  story_goal: string | null;
  current_chapter: number | null;
  memory: string | null;
  visual_style?: string | null;
  visual_description?: string | null;
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
  story_images?: StoryImage[];
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
  subscription_status?: string | null;
  next_chapter_date?: string | null;
  last_chapter_sent_at?: string | null;
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
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [imageLoadingId, setImageLoadingId] = useState<string | null>(null);
  const [approvingImageId, setApprovingImageId] = useState<string | null>(null);

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
      if (!response.ok) throw new Error(result.error || 'Feil passord.');

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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ childId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunne ikke generere Story Bible.');

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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ childId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunne ikke generere kapittel.');

      setMessage('Kapittel ble generert og lagret.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setGeneratingId(null);
    }
  }

  async function generateWeeklyStories() {
    setError('');
    setMessage('');
    setWeeklyLoading(true);

    try {
      const response = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunne ikke generere ukens kapitler.');

      setMessage(`Ferdig! Generert: ${result.generated ?? 0}, hoppet over: ${result.skipped ?? 0}, feil: ${result.failed ?? 0}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function approveStory(storyId: string) {
    setError('');
    setMessage('');
    setApprovingId(storyId);

    try {
      const response = await fetch('/api/approve-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunne ikke godkjenne historien.');

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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kunne ikke sende historien.');

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

  async function generateImagePrompt(storyId: string) {
    setError('');
    setMessage('');
    setImageLoadingId(storyId);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke generere bilde.');
      }

      setMessage('Bilde ble generert og lagret.');
await load();
setSelectedStory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setImageLoadingId(null);
    }
  }

  async function approveImage(imageId: string) {
    setError('');
    setMessage('');
    setApprovingImageId(imageId);

    try {
      const response = await fetch('/api/approve-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ imageId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke godkjenne bilde.');
      }

      setMessage('Bilde ble godkjent.');
await load();
setSelectedStory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke godkjenne bilde.');
    } finally {
      setApprovingImageId(null);
    }
  }

  function openStory(row: ChildRow, story: Story) {
    setError('');
    setSelectedChild(row.child_name);
    setSelectedStory(story);
  }

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h1>🌙 Sovestjerne admin</h1>
        <p>Se alle barn, kapitler, status, godkjenning og utsending.</p>

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

        {rows.length > 0 && (
          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <button className="button" type="button" onClick={generateWeeklyStories} disabled={weeklyLoading}>
              {weeklyLoading ? 'Genererer ukens kapitler...' : '🚀 Generer ukens kapitler'}
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="notice">{message}</p>}

        {selectedStory && (
          <div className="detail-card">
            <h2>{selectedChild} – {selectedStory.title || 'Uten tittel'}</h2>

            <p>
              <strong>Kapittel:</strong> {selectedStory.chapter_number || '-'} <br />
              <strong>Status:</strong> {selectedStory.status || '-'} <br />
              <strong>E-post:</strong> {selectedStory.email_status || '-'}
            </p>

            {selectedStory.summary && (
              <p><strong>Oppsummering:</strong> {selectedStory.summary}</p>
            )}

            <hr />

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
              {selectedStory.story_text}
            </div>

            <br />

            <div className="detail-card">
              <h3>🖼️ Bilde</h3>

              {selectedStory.story_images && selectedStory.story_images.length > 0 ? (
                <>
                  <p>
                    <strong>Status:</strong> {selectedStory.story_images[0].status || '-'} <br />
                    <strong>Generering:</strong> {selectedStory.story_images[0].generation_status || '-'}
                  </p>

                  {selectedStory.story_images[0].image_url ? (
                    <img
                      src={selectedStory.story_images[0].image_url}
                      alt="Generert bilde"
                      style={{
                        width: '100%',
                        maxWidth: '420px',
                        borderRadius: '18px',
                        display: 'block',
                        marginTop: '14px',
                        marginBottom: '18px',
                      }}
                    />
                  ) : (
                    <p>Ingen bildefil ennå.</p>
                  )}

                  {selectedStory.story_images[0].status !== 'approved' && (
                    <>
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => approveImage(selectedStory.story_images?.[0]?.id || '')}
                        disabled={approvingImageId === selectedStory.story_images[0].id}
                      >
                        {approvingImageId === selectedStory.story_images[0].id
                          ? 'Godkjenner bilde...'
                          : '✅ Godkjenn bilde'}
                      </button>

                      <br /><br />
                    </>
                  )}

                  {selectedStory.story_images[0].status === 'approved' && (
                    <p className="notice">✅ Bildet er godkjent.</p>
                  )}

                  <button
                    className="small-btn"
                    type="button"
                    onClick={() => generateImagePrompt(selectedStory.id)}
                    disabled={imageLoadingId === selectedStory.id}
                  >
                    {imageLoadingId === selectedStory.id
                      ? 'Lager nytt bilde...'
                      : '🔄 Generer nytt bilde'}
                  </button>

                  {selectedStory.story_images[0].prompt && (
                    <p>
                      <strong>Prompt:</strong><br />
                      <small>{selectedStory.story_images[0].prompt}</small>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>Ingen bilde generert ennå.</p>

                  <button
                    className="small-btn"
                    type="button"
                    onClick={() => generateImagePrompt(selectedStory.id)}
                    disabled={imageLoadingId === selectedStory.id}
                  >
                    {imageLoadingId === selectedStory.id
                      ? 'Lager bilde...'
                      : '🖼️ Generer bilde'}
                  </button>
                </>
              )}
            </div>

            <br />

            {selectedStory.status !== 'approved' && (
              <>
                <button className="small-btn" type="button" onClick={() => approveStory(selectedStory.id)} disabled={approvingId === selectedStory.id}>
                  {approvingId === selectedStory.id ? 'Godkjenner...' : '✅ Godkjenn historie'}
                </button>
                <br /><br />
              </>
            )}

            {selectedStory.status === 'approved' && selectedStory.email_status !== 'sent' && (
              <>
                <p className="notice">✅ Denne historien er godkjent og klar til sending.</p>
                <button className="small-btn" type="button" onClick={() => sendStory(selectedStory.id)} disabled={sendingId === selectedStory.id}>
                  {sendingId === selectedStory.id ? 'Sender...' : '📩 Send historie'}
                </button>
                <br /><br />
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
                <th>Abonnement</th>
                <th>Story Bible</th>
                <th>Alle kapitler</th>
                <th>Handling</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const bible = row.story_bibles?.[0];
                const stories = [...(row.stories || [])].sort(
                  (a, b) => (a.chapter_number || 0) - (b.chapter_number || 0)
                );

                return (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleDateString('nb-NO')}</td>

                    <td>{row.parent_email}</td>

                    <td>
                      <strong>{row.child_name}</strong><br />
                      {row.child_age} år<br />
                      <small>
                        {row.favorite_animal || '-'} / {row.favorite_color || '-'}
                      </small><br />
                      <small>{row.interests || '-'}</small>
                    </td>

                    <td>
                      <strong>{row.subscription_status || 'active'}</strong>
                      <br />

                      {(() => {
                        if (!row.next_chapter_date) {
                          return <span style={{ color: '#999' }}>Ingen dato satt</span>;
                        }

                        const nextDate = new Date(row.next_chapter_date);
                        const today = new Date();

                        nextDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);

                        const diffDays = Math.floor(
                          (nextDate.getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24)
                        );

                        if (diffDays <= 0) {
                          return (
                            <div>
                              🔴 <strong>Skal ha nytt kapittel i dag</strong>
                            </div>
                          );
                        }

                        if (diffDays <= 3) {
                          return <div>🟡 Neste kapittel om {diffDays} dager</div>;
                        }

                        return <div>🟢 Neste kapittel om {diffDays} dager</div>;
                      })()}

                      <br />

                      Neste dato:
                      <br />
                      {row.next_chapter_date
                        ? new Date(row.next_chapter_date).toLocaleDateString('nb-NO')
                        : '-'}

                      <br />

                      Sist sendt:
                      <br />
                      {row.last_chapter_sent_at
                        ? new Date(row.last_chapter_sent_at).toLocaleDateString('nb-NO')
                        : '-'}
                    </td>

                    <td>
                      {bible ? (
                        <>
                          <strong>{bible.universe_name || '-'}</strong><br />
                          Følgesvenn: {bible.companion_name || '-'}<br />
                          Kapittel: {bible.current_chapter || 1}<br />
                          <small>{bible.story_goal || ''}</small>
                        </>
                      ) : (
                        <span>Ikke generert</span>
                      )}
                    </td>

                    <td>
                      {stories.length > 0 ? (
                        stories.map((story) => {
                          const image = story.story_images?.[0];

                          return (
                            <div key={story.id} style={{ marginBottom: '10px' }}>
                              <button className="small-btn" type="button" onClick={() => openStory(row, story)}>
                                Les kapittel {story.chapter_number || '-'}
                              </button>
                              <br />
                              <small>
                                {story.status || '-'} / {story.email_status || '-'}
                                <br />
                                Bilde: {image ? `${image.status || '-'} / ${image.generation_status || '-'}` : 'ingen'}
                              </small>
                            </div>
                          );
                        })
                      ) : (
                        <span>Ingen kapitler</span>
                      )}
                    </td>

                    <td>
                      <button className="small-btn" type="button" onClick={() => generateStoryBible(row.id)} disabled={generatingId === row.id}>
                        {generatingId === row.id
                          ? 'Jobber...'
                          : bible
                            ? 'Generer Story Bible på nytt'
                            : 'Generer Story Bible'}
                      </button>

                      <br /><br />

                      <button className="small-btn" type="button" onClick={() => generateChapter(row.id)} disabled={generatingId === row.id || !bible}>
                        {generatingId === row.id ? 'Jobber...' : 'Generer kapittel'}
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
