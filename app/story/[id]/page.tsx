import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StoryPageProps = {
  params: Promise<{ id: string }>;
};

type StoryImage = {
  image_url: string | null;
  status: string | null;
};

function formatNorwegianDate(dateString?: string | null) {
  if (!dateString) {
    return 'snart';
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'snart';
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

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

  const { data: child } = await supabaseAdmin
    .from('children')
    .select('id, next_chapter_date')
    .eq('id', story.child_id)
    .maybeSingle();

  const approvedImage = (story.story_images as StoryImage[] | null)?.find(
    (image) => image.status === 'approved' && image.image_url
  );

  const nextChapterText = child?.next_chapter_date
    ? `Neste kapittel kommer ${formatNorwegianDate(child.next_chapter_date)}.`
    : 'Neste kapittel kommer snart.';

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
            <p>🌙 {nextChapterText}</p>
            <p>Sov godt og drøm magisk.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
