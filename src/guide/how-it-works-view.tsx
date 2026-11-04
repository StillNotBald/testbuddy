import { guide } from './guide.content';

/** The "How it works" page body, rendered from the same content as the tour and llms.txt. */
export function HowItWorksView() {
  const h = guide.howItWorks;
  return (
    <div className="space-y-8 text-base text-ink-secondary">
      <p className="text-lg text-ink">{h.lead}</p>

      <section aria-labelledby="hiw-flow">
        <h2 id="hiw-flow" className="text-lg font-semibold text-ink">The flow</h2>
        <ol className="mt-3 divide-y divide-subtle border-y border-subtle">
          {h.flow.map((f, i) => (
            <li key={f.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3">
              <span className="text-sm tabular-nums text-ink-muted" aria-hidden>{i + 1}</span>
              <div>
                <p className="font-medium text-ink">
                  {f.title}
                  <span className="ml-2 text-sm font-normal text-ink-muted">{f.who === 'you' ? 'You' : 'TestBuddy'}</span>
                </p>
                <p className="mt-0.5">{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="hiw-topics" className="space-y-6">
        <h2 id="hiw-topics" className="text-lg font-semibold text-ink">Topics</h2>
        {h.topics.map((t) => (
          <article key={t.id} id={t.id} className="scroll-mt-20">
            <h3 className="font-semibold text-ink">{t.title}</h3>
            <p className="mt-1">{t.summary}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {t.detail.map((d) => <li key={d}>{d}</li>)}
            </ul>
            <p className="mt-2 font-mono text-xs text-ink-muted">{t.codeRef}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="hiw-use" className="space-y-3">
        <h2 id="hiw-use" className="text-lg font-semibold text-ink">Use cases</h2>
        <ul className="divide-y divide-subtle border-y border-subtle">
          {h.useCases.map((u) => (
            <li key={u.title} className="py-3">
              <p className="font-medium text-ink">{u.title} <span className="text-sm font-normal text-ink-muted">for {u.who}</span></p>
              <p className="mt-0.5">{u.value}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hiw-glossary" className="space-y-3">
        <h2 id="hiw-glossary" className="text-lg font-semibold text-ink">Words used here</h2>
        <dl className="divide-y divide-subtle border-y border-subtle">
          {h.glossary.map((g) => (
            <div key={g.term} className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-medium text-ink">{g.term}</dt>
              <dd>{g.plain}</dd>
            </div>
          ))}
        </dl>
      </section>

      {h.notes.length ? (
        <ul className="space-y-1 text-sm text-ink-muted">
          {h.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
