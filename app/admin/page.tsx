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
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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
  throw new Error(
    result.details
      ? `${result.error}: ${JSON.stringify(result.details)}`
      : result.error || 'Kunne ikke generere Story Bible.'
  );
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

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h1>🌙 Sovestjerne admin</h1>
        <p>Se eventyrprofiler, generer Story Bible og klargjør historier.</p>

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
                <th>Handling</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const bible = row.story_bibles?.[0];

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
                      <button
                        className="small-btn"
                        type="button"
                        onClick={() => generateStoryBible(row.id)}
                        disabled={generatingId === row.id}
                      >
                        {generatingId === row.id
                          ? 'Genererer...'
                          : bible
                            ? 'Generer på nytt'
                            : 'Generer Story Bible'}
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
