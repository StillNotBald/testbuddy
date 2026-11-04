import type { Action } from '@/lib/permissions';

/** A screen a step can open, with the href it lives at. */
export interface TourScreen {
  label: string;
  href: string;
}

/** A goal on the picker. Every action in `requires` must be allowed for the goal to show. */
export interface TourGoal {
  id: string;
  label: string;
  hint: string;
  requires?: readonly Action[];
}

/** One ringed element. `target` is a `[data-tour="…"]` selector. */
export interface TourStep {
  /** Key into `TourContent.screens`. */
  screen: string;
  /** Query parameters added to the screen href, for example `{ tab: 'tokens' }`. */
  params?: Record<string, string>;
  target: string;
  title: string;
  text: string;
  /** Every action listed must be allowed, or the step is left out for this role. */
  requires?: readonly Action[];
}

export interface TourLabels {
  picker: { title: string; intro: string; everything: string; changeGoal: string };
  invite: { continueWord: string; resume: string; dismiss: string };
  next: string;
  back: string;
  done: string;
  close: string;
  /** Contains `{n}` and `{total}`. */
  stepOf: string;
  /** Shown in place of the step text when the element is not on screen for this role or data. */
  missing: string;
}

export interface HowItWorksFlowItem {
  id: string;
  who: 'you' | 'system';
  title: string;
  body: string;
}

export interface HowItWorksTopic {
  id: string;
  title: string;
  summary: string;
  detail: string[];
  codeRef: string;
}

export interface HowItWorksUseCase {
  title: string;
  who: string;
  value: string;
}

export interface HowItWorksGlossaryItem {
  term: string;
  plain: string;
}

export interface HowItWorksContent {
  /** Key into `TourContent.screens` for the How it works page. */
  screen: string;
  lead: string;
  flow: HowItWorksFlowItem[];
  topics: HowItWorksTopic[];
  useCases: HowItWorksUseCase[];
  glossary: HowItWorksGlossaryItem[];
  notes: string[];
}

/** The whole guide: one object feeds the tour, How it works, and llms.txt. */
export interface TourContent {
  title: string;
  screens: Record<string, TourScreen>;
  goals: TourGoal[];
  steps: Record<string, TourStep>;
  /** Goal id (or `all`) to the ordered step ids. */
  paths: Record<string, string[]>;
  labels: TourLabels;
  howItWorks: HowItWorksContent;
}
