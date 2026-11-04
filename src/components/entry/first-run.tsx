'use client';

import { FilePlus, FlaskConical, Upload, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Choice { key: string; icon: LucideIcon; title: string; body: string; cta: string; onPick: () => void; busy?: boolean }

/**
 * First run on an empty workspace (D-7): Import, Sample project, Start empty, in that order.
 * Each choice names what it creates and what it does not, so nothing is a surprise.
 */
export function FirstRunChoices({ onImport, onSample, onEmpty, sampleBusy }: { onImport: () => void; onSample: () => void; onEmpty: () => void; sampleBusy?: boolean }) {
  const choices: Choice[] = [
    { key: 'import', icon: Upload, title: 'Import cases', body: 'Bring cases from a TestRail XML, CSV or JSON export. You see a preview before anything is written.', cta: 'Import cases', onPick: onImport },
    { key: 'sample', icon: FlaskConical, title: 'Try a sample project', body: '24 cases, one run and one milestone, named "Sample". Delete it in one step when you are done.', cta: 'Create sample project', onPick: onSample, busy: sampleBusy },
    { key: 'empty', icon: FilePlus, title: 'Start empty', body: 'Create a project with no cases. Add suites and cases as you go.', cta: 'Start empty', onPick: onEmpty },
  ];
  return (
    <section aria-labelledby="first-run-title" className="mx-auto max-w-4xl space-y-4 py-6">
      <div className="text-center">
        <h2 id="first-run-title" className="text-xl font-semibold text-ink">Set up your first project</h2>
        <p className="mt-1 text-base text-ink-muted">Pick a starting point. You can change everything later.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {choices.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.key}>
              <Card className="flex h-full flex-col gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-selected text-accent-text" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold text-ink">{c.title}</h3>
                <p className="flex-1 text-base text-ink-muted">{c.body}</p>
                <Button variant={c.key === 'empty' ? 'outline' : 'primary'} loading={c.busy} onClick={c.onPick} className="w-full">{c.cta}</Button>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
