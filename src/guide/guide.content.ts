/**
 * TestBuddy's in-app guide: six goals, each a short path of real screens with one ringed element per step.
 * The same content feeds the How it works page (/how-it-works) and /llms.txt, /llms-full.txt.
 *
 * Steps point at `data-tour` attributes. Shell targets (nav-*, topbar-*, user-menu) exist now. Screen-level targets
 * are listed in src/guide/TARGETS.md for the screen builders. The tour in ./tour reads this file; it has no
 * dependencies beyond its own types.
 *
 * Routes need a project id. `createGuide` takes it; the default `guide` uses the demo project and demo run from the
 * mock fixtures so the links in /how-it-works and llms.txt point at real screens.
 */
import type { TourContent } from './tour/types';

export const DEMO_PROJECT_ID = 'prj_core';
export const DEMO_RUN_ID = 'run_web';
export const DEMO_TEST_ID = 't_run_web_1';

export interface GuideOptions {
  projectId?: string;
  runId?: string;
  testId?: string;
}

const t = (name: string) => `[data-tour="${name}"]`;

export function createGuide({ projectId = DEMO_PROJECT_ID, runId = DEMO_RUN_ID, testId = DEMO_TEST_ID }: GuideOptions = {}): TourContent {
  const p = `/p/${projectId}`;
  return {
    title: 'TestBuddy',
    screens: {
      overview: { label: 'Overview', href: p },
      cases: { label: 'Repository', href: `${p}/cases` },
      newCase: { label: 'New case', href: `${p}/cases/new` },
      milestones: { label: 'Milestones', href: `${p}/milestones` },
      runs: { label: 'Runs', href: `${p}/runs` },
      newRun: { label: 'New run', href: `${p}/runs/new` },
      run: { label: 'Run detail', href: `${p}/runs/${runId}` },
      execute: { label: 'Test execution', href: `${p}/runs/${runId}/tests/${testId}` },
      reports: { label: 'Reports', href: `${p}/reports` },
      automation: { label: 'Automation', href: `${p}/automation` },
      members: { label: 'Members', href: `${p}/members` },
      learn: { label: 'How it works', href: '/how-it-works' },
    },
    goals: [
      { id: 'first-case', label: 'Write my first test case', hint: 'From the Repository to a saved case.', requires: ['cases.write'] },
      { id: 'run-cycle', label: 'Run a test cycle', hint: 'Pick cases, create a run, watch it fill up.', requires: ['runs.write'] },
      { id: 'record-fast', label: 'Record results fast (keyboard)', hint: 'Pass, fail and move on without the mouse.', requires: ['results.write'] },
      { id: 'release-status', label: 'See how a release is going', hint: 'Overview, milestone and report in one pass.' },
      { id: 'connect-ci', label: 'Connect CI results', hint: 'A token, a mapping, and your first posted run.', requires: ['automation.mappings'] },
      { id: 'invite-team', label: 'Invite my team', hint: 'Add people and give them a role.', requires: ['members.view'] },
    ],
    steps: {
      'nav-cases': { screen: 'cases', target: t('nav-cases'), title: 'Open the Repository', text: 'Test cases live here, grouped into suites and sections. Start in the section where the new case belongs.' },
      'repo-tree': { screen: 'cases', target: t('repo-tree'), title: 'Pick a section', text: 'Choose a suite and section on the left. A new case is filed in the section you have selected.' },
      'topbar-create': { screen: 'cases', target: t('topbar-create'), title: 'Create a case', text: 'Open Create, then choose New case. The editor opens in the section you picked.', requires: ['cases.write'] },
      'case-title': { screen: 'newCase', target: t('case-title'), title: 'Name the case', text: 'Start with a title that says what is checked, for example "Login locks after 5 wrong attempts".' },
      'case-steps': { screen: 'newCase', target: t('case-steps'), title: 'Add the steps', text: 'Write each action with the result you expect. Short steps make failures easy to pin down when someone runs the case.' },
      'case-save': { screen: 'newCase', target: t('case-save'), title: 'Save the case', text: 'Saving creates version 1. Later edits save new versions, and runs keep the version they started with.' },

      'nav-runs': { screen: 'runs', target: t('nav-runs'), title: 'Open Runs', text: 'A run is a set of tests executed together against one build. Open Runs to see what is active.' },
      'runs-create': { screen: 'runs', target: t('runs-create'), title: 'Start a new run', text: 'Choose New run to pick cases or start from a plan or milestone.', requires: ['runs.write'] },
      'run-picker': { screen: 'newRun', target: t('run-picker'), title: 'Pick the cases', text: 'Tick the cases to include. Filters narrow by section, priority or tag, and the count updates as you go.' },
      'run-submit': { screen: 'newRun', target: t('run-submit'), title: 'Create the run', text: 'Name the run and create it. Each case is frozen as it is now, so later edits do not change this run.' },
      'run-progress': { screen: 'run', target: t('run-progress'), title: 'Watch it fill up', text: 'The bar and counts show Passed, Failed, Blocked, Retest and Untested as results come in.' },
      'run-close': { screen: 'run', target: t('run-close'), title: 'Close it when done', text: 'Closing a run is permanent and locks its results. Close it when the cycle is finished.', requires: ['runs.close'] },

      'run-tests': { screen: 'run', target: t('run-tests'), title: 'Open a test', text: 'Pick a test in the list. Press Enter on a highlighted row to open it, or J and K to move up and down.', requires: ['results.write'] },
      'exec-status': { screen: 'execute', target: t('exec-status'), title: 'Set the result', text: 'Passed, Failed, Blocked or Retest sit in the bar at the bottom. Add a comment, time or defect if needed.', requires: ['results.write'] },
      'exec-hotkeys': { screen: 'execute', target: t('exec-hotkeys'), title: 'Use the keys', text: 'Press P, F, B or R to set the result and N to jump to the next untested test. The mouse is optional.', requires: ['results.write'] },
      'exec-save-next': { screen: 'execute', target: t('exec-save-next'), title: 'Save and move on', text: 'Save and next records the result and opens the next test. Undo stays in the toast for ten seconds.', requires: ['results.write'] },
      'topbar-help': { screen: 'execute', target: t('topbar-help'), title: 'All shortcuts', text: 'Press ? or use this button for the full list. Single-key shortcuts can be switched off in the user menu.' },

      'overview-stats': { screen: 'overview', target: t('overview-stats'), title: 'The headline numbers', text: 'Cases, open runs, pass rate and failing tests for the last seven days. Click a tile to see what is behind it.' },
      'overview-milestone': { screen: 'overview', target: t('overview-milestone'), title: 'The active milestone', text: 'Progress toward the release goal, with the due date. Open runs and plans roll up into this bar.' },
      'milestones-list': { screen: 'milestones', target: t('milestones-list'), title: 'All milestones', text: 'Each milestone shows its due date and progress. Open one to see its plans, runs and what is still failing.' },
      'reports-index': { screen: 'reports', target: t('reports-index'), title: 'Reports', text: 'Pick a milestone or run report for pass rate, failures and trend. Anyone on the project can read these.' },
      'reports-export': { screen: 'reports', target: t('reports-export'), title: 'Share it', text: 'Export a report as CSV to share with people outside the project.', requires: ['reports.export'] },

      'nav-automation': { screen: 'automation', target: t('nav-automation'), title: 'Open Automation', text: 'This is where CI posts results. You need a token, then a mapping from test names to cases.' },
      'automation-tokens': { screen: 'automation', params: { tab: 'tokens' }, target: t('automation-tokens'), title: 'Create a token', text: 'Create a CI token. It is shown once, so copy it into your CI secrets right away.', requires: ['automation.tokens'] },
      'automation-mappings': { screen: 'automation', params: { tab: 'mappings' }, target: t('automation-mappings'), title: 'Map test names to cases', text: 'A mapping tells TestBuddy which case a CI test name belongs to, so results land on the right case.' },
      'automation-executions': { screen: 'automation', params: { tab: 'executions' }, target: t('automation-executions'), title: 'Check what arrived', text: 'Every CI upload is listed here with its outcome. Open one to see what matched and what did not.' },

      'nav-members': { screen: 'members', target: t('nav-members'), title: 'Open Members', text: 'Everyone on the project and their role is listed here.' },
      'members-invite': { screen: 'members', target: t('members-invite'), title: 'Add a person', text: 'Add someone by email and choose their role. Administrators manage members, so ask one if this is missing.', requires: ['members.write'] },
      'members-roles': { screen: 'members', target: t('members-roles'), title: 'Choose the role', text: 'Viewers read, testers record results, managers plan releases and administrators manage the project.' },
      'user-menu': { screen: 'members', target: t('user-menu'), title: 'Your menu', text: 'Replay this guide, open the keyboard shortcuts or sign out from here.' },
    },
    paths: {
      'first-case': ['nav-cases', 'repo-tree', 'topbar-create', 'case-title', 'case-steps', 'case-save'],
      'run-cycle': ['nav-runs', 'runs-create', 'run-picker', 'run-submit', 'run-progress', 'run-close'],
      'record-fast': ['run-tests', 'exec-status', 'exec-hotkeys', 'exec-save-next', 'topbar-help'],
      'release-status': ['overview-stats', 'overview-milestone', 'milestones-list', 'reports-index', 'reports-export'],
      'connect-ci': ['nav-automation', 'automation-tokens', 'automation-mappings', 'automation-executions'],
      'invite-team': ['nav-members', 'members-invite', 'members-roles', 'user-menu'],
      all: ['nav-cases', 'topbar-create', 'nav-runs', 'exec-hotkeys', 'overview-milestone', 'reports-index', 'nav-automation', 'nav-members', 'topbar-help', 'user-menu'],
    },
    labels: {
      picker: { title: 'What do you want to do?', intro: 'Pick one. The guide shows only what you need.', everything: 'Show me everything', changeGoal: 'Change goal' },
      invite: { continueWord: 'Continue:', resume: 'Resume', dismiss: 'Not now' },
      next: 'Next',
      back: 'Back',
      done: 'Done',
      close: 'Close the guide',
      stepOf: 'Step {n} of {total}',
      missing: "This part of the screen isn't here for your role or data.",
    },
    howItWorks: {
      screen: 'learn',
      lead: 'How TestBuddy keeps cases, runs and results together, in plain words.',
      flow: [
        { id: 'write', who: 'you', title: 'Write cases', body: 'Cases are reusable tests with steps and expected results, filed in suites and sections. Every edit saves a new version.' },
        { id: 'plan', who: 'you', title: 'Plan the work', body: 'Group cases into a plan or milestone for a release, or start a run directly from the cases you pick.' },
        { id: 'run', who: 'system', title: 'Freeze a run', body: 'A run copies each chosen case at its current version. Edits to the case later do not change a run in progress.' },
        { id: 'record', who: 'you', title: 'Record results', body: 'Testers set Passed, Failed, Blocked or Retest, with comments, time and defects. Keys make this fast.' },
        { id: 'ci', who: 'system', title: 'Take CI results', body: 'A CI job posts results with a token. Mappings connect test names to cases so results land in the right run.' },
        { id: 'decide', who: 'you', title: 'Decide the release', body: 'Overview, milestone and run reports show pass rate, failures and trend so the team can call it.' },
      ],
      topics: [
        {
          id: 'roles', title: 'Roles and access', summary: 'Four project roles decide who can see and change what. The server stays the final check; the screens only hide what you cannot use.',
          detail: ['Viewer: read cases, runs and reports.', 'Tester: write cases and record results.', 'Manager: plans, milestones, exports, mappings.', 'Admin: members, tokens, audit log, settings.'],
          codeRef: 'src/lib/permissions.ts (can)',
        },
        {
          id: 'versions', title: 'Case versions and snapshots', summary: 'Saving a case makes a new version. A run keeps the version it started with, so history stays true even when cases change later.',
          detail: ['Each test in a run shows its version, for example v3.', 'A banner says when a newer version exists.', 'Results from older versions are labelled with that version.'],
          codeRef: 'src/services/types.ts (TestRunCase)',
        },
        {
          id: 'statuses', title: 'Result statuses', summary: 'Five fixed statuses: Passed, Failed, Blocked, Retest and Untested. Colours are chosen to stay readable for colour-blind users, and text always names the status.',
          detail: ['A status can require a comment.', 'The latest result sets the test status.', 'Earlier results stay in the test history.'],
          codeRef: 'src/services/status.ts',
        },
        {
          id: 'keyboard', title: 'Keyboard execution', summary: 'Running tests needs no mouse. Letter keys set results and move through the list, and every key has a visible button twin.',
          detail: ['P, F, B, R set the result.', 'N jumps to the next untested test.', 'J and K move, Enter opens, Esc closes.', 'Single-key shortcuts can be turned off.'],
          codeRef: 'src/lib/hotkeys.ts (useHotkeys, setSingleKeyShortcuts)',
        },
      ],
      useCases: [
        { title: 'Regression cycle', who: 'Tester or lead', value: 'Pick the regression cases, run them against a build and see the failures at once.' },
        { title: 'Release call', who: 'Manager', value: 'Read the milestone report before the go or no-go meeting.' },
        { title: 'CI feed', who: 'Admin', value: 'Post automated results next to manual ones in the same run and report.' },
      ],
      glossary: [
        { term: 'Case', plain: 'A reusable test with steps and expected results. It has versions.' },
        { term: 'Run', plain: 'A set of tests executed together against a build. Closing is permanent.' },
        { term: 'Plan', plain: 'A group of runs, usually for one release effort.' },
        { term: 'Milestone', plain: 'A release or date goal that plans and runs roll up into.' },
        { term: 'Snapshot', plain: 'The frozen copy of a case that a test in a run uses.' },
        { term: 'Mapping', plain: 'A rule that connects CI test names to cases.' },
        { term: 'Token', plain: 'A secret a CI job uses to post results. Shown once.' },
      ],
      notes: ['Demo data in this build is stored in your browser only.'],
    },
  };
}

export const guide: TourContent = createGuide();
