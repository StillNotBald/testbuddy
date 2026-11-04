import { can } from '@/lib/permissions';
import { ServiceError } from '../interfaces';
import type { Id, Milestone, Project, ProjectMember, TestCase, TestCaseVersion, TestRun, TestRunCase, TestSection, TestStep, TestSuite, WorkspaceMember } from '../types';
import { audit, getMockDb, me } from './core';
import { IDS } from './fixtures';

/**
 * Sample project seed (D-7 "Create sample project"). Two suites, 24 cases, one open run and one milestone,
 * all labelled "Sample" in the name. Fictional content only. Writes in one transaction.
 */
const TITLES = [
  'Sign in with valid credentials', 'Reject a wrong password', 'Lock the account after five failed attempts',
  'Reset a password from the email link', 'Sign out clears the session', 'Remember me keeps the session for seven days',
  'Add an item to the cart', 'Remove an item from the cart', 'Apply a valid discount code',
  'Reject an expired discount code', 'Pay with a saved card', 'Show a clear error when payment is declined',
  'Search returns matching products', 'Empty search shows a helpful message', 'Filter results by price',
  'Sort results by rating', 'Paginate through long result lists', 'Product page shows stock status',
  'Create an order with a valid token', 'Reject an order with an expired token', 'List orders for the signed-in account',
  'Cancel an order before dispatch', 'Return not found for an unknown order', 'Rate limit repeated order requests',
];
const WEB_SECTIONS = ['Login', 'Checkout', 'Search'];
const PRIORITIES = ['pr_p1', 'pr_p2', 'pr_p3'] as const;

function uniqueName(base: string, exists: (candidate: string) => boolean): string {
  let name = base;
  for (let n = 2; exists(name); n += 1) name = `${base} ${n}`;
  return name;
}

function uniquePrefix(base: string, exists: (candidate: string) => boolean): string {
  let prefix = base;
  for (let n = 2; exists(prefix); n += 1) prefix = `${base}${n}`;
  return prefix;
}

export function createSampleProject(workspaceId: Id): Project {
  const u = me();
  const wm = getMockDb().find<WorkspaceMember>('workspace_members', (m) => m.workspace === workspaceId && m.user === u.id);
  const canCreate = wm?.role === 'admin' || getMockDb().list<ProjectMember>('project_members', (m) => m.user === u.id).some((m) => can(m.role, 'project.create'));
  if (!wm || !canCreate) throw new ServiceError('forbidden', 'Your role does not allow this.');

  const db = getMockDb();
  const name = uniqueName('Sample project', (n) => !!db.find<Project>('projects', (p) => p.workspace === workspaceId && p.name.toLowerCase() === n.toLowerCase()));
  const prefix = uniquePrefix('SMP', (c) => !!db.find<Project>('projects', (p) => p.workspace === workspaceId && p.ref_prefix === c));

  return db.transaction((tx) => {
    const p = tx.create<Project>('projects', { workspace: workspaceId, name, announcement: undefined, ref_prefix: prefix, case_counter: 0, is_archived: false });
    tx.create<ProjectMember>('project_members', { project: p.id, user: u.id, role: 'admin' });

    const webSuite = tx.create<TestSuite>('test_suites', { project: p.id, name: 'Web app', description: 'Sample suite: sign-in, checkout and search.', is_baseline: false, is_completed: false });
    const apiSuite = tx.create<TestSuite>('test_suites', { project: p.id, name: 'API', description: 'Sample suite: order endpoints.', is_baseline: false, is_completed: false });
    const sectionFor = new Map<string, TestSection>();
    WEB_SECTIONS.forEach((s, i) => sectionFor.set(`web:${s}`, tx.create<TestSection>('test_sections', { project: p.id, suite: webSuite.id, name: s, position: i + 1 })));
    sectionFor.set('api:Orders', tx.create<TestSection>('test_sections', { project: p.id, suite: apiSuite.id, name: 'Orders', position: 1 }));

    const webCaseIds: Id[] = [];
    TITLES.forEach((title, i) => {
      const isWeb = i < 18;
      const suite = isWeb ? webSuite : apiSuite;
      const section = isWeb ? sectionFor.get(`web:${WEB_SECTIONS[Math.floor(i / 6)]}`)! : sectionFor.get('api:Orders')!;
      const counter = i + 1;
      const c = tx.create<TestCase>('test_cases', {
        project: p.id, suite: suite.id, section: section.id, ref: `${prefix}-C${counter}`, title,
        priority: PRIORITIES[i % 3], type: i % 2 ? 'ct_smoke' : 'ct_functional', automation_status: 'not_specified',
        version: 1, deprecated: false, created_by: u.id, updated_by: u.id,
      });
      const steps = [
        { description: 'Open the screen or call the endpoint under test', expected_result: undefined },
        { description: `Check the outcome: ${title.toLowerCase()}`, expected_result: 'The system behaves as the requirement says.' },
      ].map((s, pos) => tx.create<TestStep>('test_steps', { case: c.id, position: pos + 1, description: s.description, expected_result: s.expected_result }));
      tx.create<TestCaseVersion>('test_case_versions', {
        case: c.id, project: p.id, version: 1, saved_by: u.id,
        snapshot: {
          case: { ref: c.ref, title: c.title, priority: c.priority, type: c.type, automation_status: c.automation_status, version: 1 },
          steps: steps.map((s) => ({ position: s.position, description: s.description, expected_result: s.expected_result })),
        },
      });
      if (isWeb) webCaseIds.push(c.id);
    });
    tx.update<Project>('projects', p.id, { case_counter: TITLES.length });

    const milestone = tx.create<Milestone>('milestones', {
      project: p.id, title: 'Sample release 1.0', description: 'Sample milestone. Delete it when you have seen how it works.',
      expires_on: new Date(Date.now() + 14 * 86_400_000).toISOString(), is_completed: false,
    });
    const run = tx.create<TestRun>('test_runs', {
      project: p.id, suite: webSuite.id, milestone: milestone.id, name: 'Smoke sample', include_all: true,
      build: 'sample-1', started_on: new Date().toISOString(), is_closed: false, created_by: u.id,
    });
    webCaseIds.forEach((cid) => {
      const c = tx.get<TestCase>('test_cases', cid)!;
      const steps = tx.list<TestStep>('test_steps', (s) => s.case === cid);
      tx.create<TestRunCase>('test_run_cases', {
        run: run.id, project: p.id, case: cid, version: c.version,
        case_snapshot: { case: { ref: c.ref, title: c.title }, steps: steps.map((s) => ({ position: s.position, description: s.description })) },
        status: IDS.status.untested,
      });
    });

    audit(p.id, 'project.create', 'project', p.id, undefined, { name, ref_prefix: prefix, sample: true });
    return tx.get<Project>('projects', p.id) ?? p;
  });
}

