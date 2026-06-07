import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function StoryPage({ params }: { params: { id: string } }) {
  const { data: story, error } = await supabaseAdmin
    .from('stories')
    .select(`
      id,
      title,
      story_text,
      chapter_number,
      created_at,
      children (
        child_name
      )
    `)
    .eq('id', params.id)
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

  const childName =
    Array.isArray(story.children)
      ? story.children[0]?.child_name
      : story.children?.child_name;

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo">
            <span className="star">★</span> Sovestjerne
          </div>

          <h1>{story.title}</h1>

          <p>
            Kapittel {story.chapter_number} for {childName || 'barnet ditt'}
          </p>
        </section>

        <section className="story-reader">
          <div className="story-text-view">
            {story.story_text}
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
