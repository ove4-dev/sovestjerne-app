'use client';

import { FormEvent, useState } from 'react';

type ChildRow = {
  id: string;
  created_at: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  favorite_animal: string | null;
  favorite_color: string | null;
  interests: string | null;
  story_bibles?: { universe_name: string | null; companion_name: string | null; current_chapter: number | null }[];
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin', { headers: { 'x-admin-password': password } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Feil passord eller feil i systemet.');
      setRows(result.children || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h1>Sovestjerne admin</h1>
        <p>Se nye eventyrprofiler som er sendt inn.</p>
        <form className="admin-login" onSubmit={load}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin-passord" />
          <button className="button" type="submit" disabled={loading}>{loading ? 'Laster...' : 'Åpne admin'}</button>
        </form>
        {error && <p className="error">{error}</p>}
        {rows.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr><th>Dato</th><th>Forelder</th><th>Barn</th><th>Favoritter</th><th>Interesser</th><th>Univers</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleDateString('nb-NO')}</td>
                  <td>{row.parent_email}</td>
                  <td><strong>{row.child_name}</strong><br />{row.child_age} år</td>
                  <td>{row.favorite_animal || '-'}<br />{row.favorite_color || '-'}</td>
                  <td>{row.interests || '-'}</td>
                  <td>{row.story_bibles?.[0]?.universe_name || '-'}<br />{row.story_bibles?.[0]?.companion_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
