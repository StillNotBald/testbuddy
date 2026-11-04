import { ServiceError, type Services } from '../interfaces';

/**
 * PocketBase implementation: arrives in Milestone 1 (uses src/lib/pb.ts and the /api/v1 facade).
 * Every method throws until then so a wrong NEXT_PUBLIC_DATA_SOURCE fails loudly.
 */
function makeStub(domain: string): unknown {
  return new Proxy({}, { get: () => () => Promise.reject(new ServiceError('not_implemented', `${domain}: not implemented (M1)`)) });
}

export const pocketbaseServices: Services = {
  auth: makeStub('auth') as Services['auth'],
  workspaces: makeStub('workspaces') as Services['workspaces'],
  projects: makeStub('projects') as Services['projects'],
  members: makeStub('members') as Services['members'],
  lookups: makeStub('lookups') as Services['lookups'],
  suites: makeStub('suites') as Services['suites'],
  cases: makeStub('cases') as Services['cases'],
  milestones: makeStub('milestones') as Services['milestones'],
  plans: makeStub('plans') as Services['plans'],
  runs: makeStub('runs') as Services['runs'],
  tests: makeStub('tests') as Services['tests'],
  results: makeStub('results') as Services['results'],
  reports: makeStub('reports') as Services['reports'],
  automation: makeStub('automation') as Services['automation'],
  audit: makeStub('audit') as Services['audit'],
  settings: makeStub('settings') as Services['settings'],
};
