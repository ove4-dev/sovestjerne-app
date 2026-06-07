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
  favorite_place: string | null;
  interests: string | null;
  personality: string | null;
  things_to_avoid: string | null;
  dreams: string | null;
  story_bibles?: StoryBible[];
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [selected, setSelected] = useState<ChildRow | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    setError('');
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
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h1>🌙 Sovestjerne Admin</h1>
        <p>Se alle barn som har fylt ut eventyrprofilen.</p>

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

        {rows.length > 0 && (
          <>
            <div className="admin-stats">
              <div>
                <strong>{rows.length}</strong>
                <span>profiler</span>
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Forelder</th>
                  <th>Barn</th>
                  <th>Interesser</th>
                  <th>Univers</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const bible = row.story_bibles?.[0];

                  return (
                    <tr key={row.id}>
                      <td>{new Date(row.created_at).toLocaleString('nb-NO')}</td>
                      <td>{row.parent_email}</td>
                      <td>
                        <strong>{row.child_name}</strong>
                        <br />
                        {row.child_age} år
                      </td>
                      <td>{row.interests || '-'}</td>
                      <td>
                        {bible?.universe_name || '-'}
                        <br />
                        <small>{bible?.companion_name || '-'}</small>
                      </td>
                      <td>
                        <button className="small-btn" onClick={() => setSelected(row)}>
                          Se detaljer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {selected && (
          <div className="detail-card">
            <h2>{selected.child_name}</h2>

            <p><strong>Forelder:</strong> {selected.parent_email}</p>
            <p><strong>Alder:</strong> {selected.child_age}</p>
            <p><strong>Favorittdyr:</strong> {selected.favorite_animal || '-'}</p>
            <p><strong>Favorittfarge:</strong> {selected.favorite_color || '-'}</p>
            <p><strong>Favorittsted:</strong> {selected.favorite_place || '-'}</p>
            <p><strong>Interesser:</strong> {selected.interests || '-'}</p>
            <p><strong>Personlighet:</strong> {selected.personality || '-'}</p>
            <p><strong>Unngå:</strong> {selected.things_to_avoid || '-'}</p>
            <p><strong>Drømmer:</strong> {selected.dreams || '-'}</p>

            <hr />

            <h3>Story Bible</h3>
            <p><strong>Univers:</strong> {selected.story_bibles?.[0]?.universe_name || '-'}</p>
            <p><strong>Følgesvenn:</strong> {selected.story_bibles?.[0]?.companion_name || '-'}</p>
            <p><strong>Oppdrag:</strong> {selected.story_bibles?.[0]?.story_goal || '-'}</p>
            <p><strong>Minne:</strong> {selected.story_bibles?.[0]?.memory || '-'}</p>

            <button className="small-btn" onClick={() => setSelected(null)}>
              Lukk
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
