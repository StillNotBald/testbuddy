'use client';

import { Archive, Lock } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { RoleGate } from '@/components/tb/role-gate';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { RadioGroup, RadioItem } from '@/components/ui/radio-group';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { useUrlParam } from '@/lib/use-url-state';
import { useSetArchived, useUpdateProject } from '@/services/hooks';

type ImportFormat = 'testrail' | 'json';

/** Fixed sample shown in the import flow. Nothing is read from the chosen file. */
const SAMPLE_PREVIEW = { suites: 3, sections: 12, cases: 120, duplicates: 2 };
const SAMPLE_RESULT = { imported: 118, skipped: 2 };

export function SettingsScreen({ projectId }: { projectId: string }) {
  const { project, archived } = useProjectContext();
  // Announcement follows the shared matrix (settings.announcement: admin and manager), per DESIGN.md section 8.
  const canGeneral = useCan('settings.announcement', { writes: false });
  const canImport = useCan('settings.import', { writes: false });
  const canArchive = useCan('project.archive', { writes: false });

  const defaultTab = canGeneral ? 'general' : canImport ? 'import' : 'danger';
  const [tab, setTab] = useUrlParam('tab', defaultTab);

  if (!canGeneral && !canImport && !canArchive) {
    return (
      <>
        <PageHeader title="Settings" />
        <EmptyState icon={Lock} tone="locked" title="You do not have permission to view settings" description="Ask an admin if you need access." />
      </>
    );
  }

  const visible: string[] = [canGeneral ? 'general' : '', canImport ? 'import' : '', canArchive ? 'danger' : ''].filter(Boolean);
  const active = visible.includes(tab) ? tab : defaultTab;

  return (
    <>
      <PageHeader title="Settings" meta={project?.name} />
      <Tabs
        value={active}
        onValueChange={(v) => setTab(v)}
        items={[
          { value: 'general', label: 'General', hidden: !canGeneral, content: canGeneral ? <AnnouncementSection projectId={projectId} initial={project?.announcement ?? ''} /> : null },
          { value: 'import', label: 'Import', hidden: !canImport, content: canImport ? <ImportSection /> : null },
          { value: 'danger', label: 'Danger zone', hidden: !canArchive, content: canArchive ? <DangerSection projectId={projectId} name={project?.name ?? ''} archived={archived} /> : null },
        ]}
      />
    </>
  );
}

function AnnouncementSection({ projectId, initial }: { projectId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const update = useUpdateProject(projectId);
  const save = () => update.mutate({ announcement: text.trim() }, {
    onSuccess: () => toast.success('Announcement saved'),
    onError: (e) => toast.error(e.message),
  });
  return (
    <section aria-labelledby="set-announcement" className="max-w-xl space-y-4">
      <h2 id="set-announcement" className="text-xl font-semibold text-ink">Announcement</h2>
      <FormField label="Announcement" hint="Shown on the project overview. Leave empty to hide it.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      </FormField>
      <RoleGate action="settings.announcement">
        <Button variant="primary" onClick={save} loading={update.isPending}>Save announcement</Button>
      </RoleGate>
    </section>
  );
}

function ImportSection() {
  const [format, setFormat] = useState<ImportFormat>('testrail');
  const [fileName, setFileName] = useState<string>();
  const [options, setOptions] = useState({ mapPriorities: true, skipDuplicates: false });
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<typeof SAMPLE_RESULT>();

  const pick = (f: ImportFormat) => { setFormat(f); setPreviewed(false); setResult(undefined); };
  const runImport = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); setResult(SAMPLE_RESULT); toast.success('Import finished'); }, 600);
  };

  return (
    <section aria-labelledby="set-import" className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h2 id="set-import" className="text-xl font-semibold text-ink">Import</h2>
        <p className="text-sm text-ink-muted">Bring cases in from another tool. Preview first, then import.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-ink">Source</legend>
        <RadioGroup value={format} onValueChange={(v) => pick(v as ImportFormat)} aria-label="Import source">
          <RadioItem value="testrail" label="TestRail XML or CSV" />
          <RadioItem value="json" label="JSON cases" />
        </RadioGroup>
      </fieldset>

      <FormField label="File" hint={fileName ? `Selected: ${fileName}` : 'Choose a file to preview.'}>
        <Input type="file" accept={format === 'testrail' ? '.xml,.csv' : '.json'} onChange={(e) => { setFileName(e.target.files?.[0]?.name); setPreviewed(false); setResult(undefined); }} />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!fileName} onClick={() => setPreviewed(true)}>Preview import</Button>
      </div>

      {previewed ? (
        <div className="space-y-4 rounded-md border border-subtle bg-surface p-4">
          <p className="text-sm text-ink-muted">Sample summary. Nothing was read from your file.</p>
          <dl className="grid grid-cols-3 gap-4">
            <div><dt className="text-sm text-ink-muted">Suites</dt><dd className="text-kpi font-bold tabular-nums">{SAMPLE_PREVIEW.suites}</dd></div>
            <div><dt className="text-sm text-ink-muted">Sections</dt><dd className="text-kpi font-bold tabular-nums">{SAMPLE_PREVIEW.sections}</dd></div>
            <div><dt className="text-sm text-ink-muted">Cases</dt><dd className="text-kpi font-bold tabular-nums">{SAMPLE_PREVIEW.cases}</dd></div>
          </dl>
          <div className="space-y-2">
            <Checkbox checked={options.mapPriorities} onCheckedChange={(c) => setOptions((o) => ({ ...o, mapPriorities: c === true }))} aria-label="Map priorities" />
            <span className="ml-2 text-sm text-ink">Map priorities</span>
          </div>
          <div className="space-y-2">
            <Checkbox checked={options.skipDuplicates} onCheckedChange={(c) => setOptions((o) => ({ ...o, skipDuplicates: c === true }))} aria-label="Skip duplicates by title" />
            <span className="ml-2 text-sm text-ink">Skip duplicates by title ({SAMPLE_PREVIEW.duplicates} in the sample)</span>
          </div>
          <RoleGate action="settings.import">
            <Button variant="primary" onClick={runImport} loading={busy}>Import</Button>
          </RoleGate>
        </div>
      ) : null}

      {result ? (
        <p role="status" className="text-base text-ink">{`${result.imported} imported, ${result.skipped} skipped.`}</p>
      ) : null}
    </section>
  );
}

function DangerSection({ projectId, name, archived }: { projectId: string; name: string; archived: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const setArchived = useSetArchived(projectId);

  const archive = async () => {
    try {
      await setArchived.mutateAsync(true);
      toast.success('Project archived');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive the project.');
    }
  };
  const unarchive = () => setArchived.mutate(false, {
    onSuccess: () => toast.success('Project unarchived'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <section aria-labelledby="set-danger" className="max-w-xl space-y-4 rounded-md border border-subtle bg-surface p-4">
      <h2 id="set-danger" className="text-xl font-semibold text-ink">Archive project</h2>
      {archived ? (
        <>
          <p className="text-base text-ink-secondary">This project is archived. Runs can no longer be changed. You can unarchive it at any time.</p>
          <RoleGate action="project.archive" writes={false}>
            <Button variant="outline" onClick={unarchive} loading={setArchived.isPending} iconLeft={<Archive className="size-4" aria-hidden />}>Unarchive project</Button>
          </RoleGate>
        </>
      ) : (
        <>
          <p className="text-base text-ink-secondary">Runs can no longer be changed while the project is archived. You can unarchive it later.</p>
          <RoleGate action="project.archive" writes={false}>
            <Button variant="danger" onClick={() => setConfirming(true)} iconLeft={<Archive className="size-4" aria-hidden />}>Archive project</Button>
          </RoleGate>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Archive ${name}?`}
        description="The project becomes read-only for everyone. Admins can unarchive it."
        confirmLabel={`Archive ${name}`}
        tone="danger"
        requireText={name}
        onConfirm={archive}
      />
    </section>
  );
}
