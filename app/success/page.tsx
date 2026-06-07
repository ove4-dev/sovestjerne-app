import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo"><span className="star">★</span> Sovestjerne</div>
          <h1>Eventyrprofilen er lagret ✨</h1>
          <p>Vi har alt vi trenger for å starte barnets personlige eventyrunivers.</p>
        </section>
        <section className="success-box">
          <h1>Første kapittel er på vei</h1>
          <p>Hvis bestillingen er gjort før kl. 12, sendes første kapittel kl. 17. Hvis ikke, sendes det neste leveringsdag.</p>
          <p>Snart får barnet ditt møte sitt eget eventyr.</p>
          <Link href="/" className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>Til forsiden</Link>
        </section>
      </div>
    </main>
  );
}
