import Link from 'next/link';

export default function Home() {
  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo"><span className="star">★</span> Sovestjerne</div>
          <h1>Barnet ditt blir helten i sitt eget eventyr</h1>
          <p>Dette er portalen for onboarding, barnets profil og senere foreldreside.</p>
        </section>
        <section className="success-box">
          <p>Start med å fylle ut barnets eventyrprofil.</p>
          <Link href="/start" className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>
            ✨ Gå til startskjema
          </Link>
        </section>
      </div>
    </main>
  );
}
