/** Editable marketing content on the login page's left panel. Mirrors `LoginContentDto`. */
export interface LoginContent {
  headlineLead: string;
  headlineHighlight: string;
  headlineTrail: string;
  subtitle: string;
  stat1Label: string;
  stat1Value: string;
  stat2Label: string;
  stat2Value: string;
  stat3Label: string;
  stat3Value: string;
  quoteText: string;
  quoteAuthor: string;
  quoteRole: string;
}

/** Everything the anonymous login page renders. Mirrors `PublicLoginPageDto`. */
export interface PublicLoginPage {
  agencyName: string;
  logo?: string | null;
  content: LoginContent;
}

export const DEFAULT_LOGIN_CONTENT: LoginContent = {
  headlineLead: 'Field service',
  headlineHighlight: 'reimagined',
  headlineTrail: 'with AI',
  subtitle:
    'Intelligent scheduling, real-time dispatch, and AI-powered insights for modern service businesses.',
  stat1Label: 'Jobs Dispatched',
  stat1Value: '1.2M+',
  stat2Label: 'Active Teams',
  stat2Value: '2,400+',
  stat3Label: 'Uptime SLA',
  stat3Value: '99.97%',
  quoteText:
    "WorkProvider360 cut our scheduling time by 70% and increased our first-time fix rate to 94%. It's transformed how we operate.",
  quoteAuthor: 'Jordan Rivera',
  quoteRole: 'COO, ClearPath HVAC — Toronto, ON',
};
