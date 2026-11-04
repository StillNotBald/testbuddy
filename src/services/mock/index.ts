import type { Services } from '../interfaces';
import {
  authService, casesService, lookupsService, membersService, projectsService, suitesService, workspacesService,
} from './services-a';
import {
  auditService, automationService, milestonesService, plansService, reportsService, resultsService, runsService, settingsService, testsService,
} from './services-b';

export const mockServices: Services = {
  auth: authService,
  workspaces: workspacesService,
  projects: projectsService,
  members: membersService,
  lookups: lookupsService,
  suites: suitesService,
  cases: casesService,
  milestones: milestonesService,
  plans: plansService,
  runs: runsService,
  tests: testsService,
  results: resultsService,
  reports: reportsService,
  automation: automationService,
  audit: auditService,
  settings: settingsService,
};
