import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type StoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;

  const { data: story, error } = await supabaseAdmin
    .from('stories')
    .select(`
      id,
      title,
      story_text,
      chapter_number,
      created_at,
      child_id,
      story_images (
        image_url,
        status
      )
    `)
    .eq('id', id)
    .single();

  if (error || !story) {
    return (
      <main className="page-shell">
        <div className="card">
          <section className="success-box">
            <h1>Historien ble ikke funnet</h1>
            <p>Lenken kan være feil, eller historien er ikke klar ennå.</p>
          </section>
        </div>
      </main>
    );
  }

  const approvedImage = story.story_images?.find(
    (image) => image.status === 'approved' && image.image_url
  );

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo">
            <span className="star">★</span> Sovestjerne
          </div>

          <h1>{story.title || 'Sovestjerne-eventyr'}</h1>
          <p>Kapittel {story.chapter_number || 1}</p>
        </section>

        <section className="story-reader">
          {approvedImage?.image_url && (
            <img
              src={approvedImage.image_url}
              alt="Illustrasjon til kapittelet"
              style={{
                width: '100%',
                borderRadius: '22px',
                marginBottom: '28px',
              }}
            />
          )}

          <div
  className="story-text-view"
  style={{
    whiteSpace: 'pre-line',
    lineHeight: 1.9,
  }}
>
  {story.story_text}
</div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a
              href="/foreldre"
              className="button"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              ← Tilbake til foreldreportalen
            </a>
          </div>

          <div className="story-footer">
            <p>🌙 Neste kapittel kommer snart.</p>
            <p>Sov godt og drøm magisk.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
