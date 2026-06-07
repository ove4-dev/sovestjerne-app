import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

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
      child_id
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

  let childName = 'barnet ditt';

  if (story.child_id) {
    const { data: child } = await supabaseAdmin
      .from('children')
      .select('child_name')
      .eq('id', story.child_id)
      .single();

    if (child?.child_name) {
      childName = child.child_name;
    }
  }

  return (
    <main className="page-shell">
      <div className="card">
        <section className="header">
          <div className="logo">
            <span className="star">★</span> Sovestjerne
          </div>

          <h1>{story.title}</h1>

          <p>
            Kapittel {story.chapter_number} for {childName}
          </p>
        </section>

        <section className="story-reader">
          <div className="story-text-view">{story.story_text}</div>

          <div className="story-footer">
            <p>🌙 Neste kapittel kommer snart.</p>
            <p>Sov godt og drøm magisk.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
