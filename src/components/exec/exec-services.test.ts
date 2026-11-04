import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRerunFailed } from '@/services/hooks';
import { ServiceError } from '@/services/interfaces';
import { mockServices as s } from '@/services/mock';
import { IDS, freshDbForTest } from './exec-services-setup';

const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return e instanceof ServiceError ? e.code : 'other'; } };

beforeEach(() => freshDbForTest(IDS.users.dana));

describe('results.update and reports.changes', () => {
  it('edits comment, time and defects of your own result but never the status', async () => {
    const t = (await s.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items[0]!;
    const res = await s.results.add({ testId: t.test.id, statusId: IDS.status.passed, comment: 'ok' });
    const next = await s.results.update(res.id, { comment: 'checked twice', elapsed: 90, defects: ['JIRA-1'] });
    expect(next).toMatchObject({ comment: 'checked twice', elapsed: 90, defects: ['JIRA-1'], status: IDS.status.passed });
  });

  it('refuses to edit a result in a closed run or someone else\'s result', async () => {
    const closed = (await s.tests.list({ runId: IDS.runs.r23 })).items.find((i) => i.last_result_id)!;
    expect(await code(s.results.update(closed.last_result_id!, { comment: 'x' }))).toBe('closed');
    const other = (await s.tests.get((await s.tests.list({ runId: IDS.runs.web, status: ['passed'] })).items[0]!.test.id)).results.find((r) => r.result.created_by !== IDS.users.dana);
    if (other) expect(await code(s.results.update(other.result.id, { comment: 'x' }))).toBe('forbidden');
  });

  it('requires a comment on a flagged status when editing', async () => {
    const t = (await s.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items[0]!;
    const res = await s.results.add({ testId: t.test.id, statusId: IDS.status.failed, comment: 'broken' });
    expect(await code(s.results.update(res.id, { comment: '   ' }))).toBe('validation');
  });

  it('reports changes versus the previous run of the same suite', async () => {
    const ch = await s.reports.changes(IDS.runs.web);
    expect(ch.previous_run?.id).toBe(IDS.runs.r23);
    const total = Object.values(ch.counts).reduce((a, b) => a + b, 0);
    expect(ch.items).toHaveLength(total);
  });
});

describe('re-run failed', () => {
  it('leaves deprecated cases out of the new run and of the count', async () => {
    const [a, b] = (await s.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items;
    await s.results.add({ testId: a!.test.id, statusId: IDS.status.failed, comment: 'broken' });
    await s.results.add({ testId: b!.test.id, statusId: IDS.status.failed, comment: 'broken' });
    await s.auth.signInAs(IDS.users.raj); // attaching the re-run to the plan and milestone needs a manager
    await s.cases.bulkUpdate([b!.test.case!], { deprecated: true });
    const failedBefore = (await s.tests.list({ runId: IDS.runs.web, status: ['failed', 'blocked'] })).items.length;
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
    const { result } = renderHook(() => useRerunFailed(IDS.projectCore), { wrapper });
    const source = await s.runs.get(IDS.runs.web);
    result.current.mutate(source);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.count).toBe(failedBefore - 1);
    const created = await s.tests.list({ runId: result.current.data!.run });
    expect(created.total).toBe(failedBefore - 1);
    expect(created.items.some((i) => i.test.case === b!.test.case)).toBe(false);
  });
});
