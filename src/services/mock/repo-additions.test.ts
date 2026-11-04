import { beforeEach, describe, expect, it } from 'vitest';
import { mockServices as s } from '.';
import { setMockDb, writeSessionUserId } from './core';
import { buildFixtures, IDS } from './fixtures';
import { MockDb } from './mockdb';

beforeEach(() => {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(IDS.users.dana);
});

describe('repository additions', () => {
  it('coalesces quick edits by the same author into one version (D-5) unless asked not to', async () => {
    const all = (await s.cases.list({ projectId: IDS.projectCore, pageSize: 500 })).items.map((i) => i.case);
    const c = all[all.length - 1]!;
    const first = await s.cases.update(c.id, { title: 'Edit one' }, { expectedVersion: c.version });
    expect(first.case.version).toBe(c.version + 1);
    const second = await s.cases.update(c.id, { title: 'Edit two' }, { expectedVersion: first.case.version, coalesce: true });
    expect(second.case.version).toBe(first.case.version);
    expect((await s.cases.versions(c.id)).filter((v) => v.version.version === first.case.version)).toHaveLength(1);
    const third = await s.cases.update(c.id, { title: 'Edit three' }, { expectedVersion: second.case.version, coalesce: false });
    expect(third.case.version).toBe(second.case.version + 1);
  });

  it('moves a section to another suite with its cases', async () => {
    const tree = await s.suites.tree(IDS.projectCore);
    const web = tree[0]!;
    const sec = web.sections[0]!.section;
    const target = tree[1]!.suite;
    const moved = await s.suites.moveSection(sec.id, { suite: target.id });
    expect(moved.suite).toBe(target.id);
    const cases = (await s.cases.list({ projectId: IDS.projectCore, sectionId: sec.id, pageSize: 500 })).items;
    expect(cases.every((i) => i.case.suite === target.id)).toBe(true);
  });
});
