import type { Conference } from '../types/conference';

/**
 * Demo / seed dataset.
 *
 * IMPORTANT: These use real conference names for realism, but the specific
 * figures, dates and evidence notes are ILLUSTRATIVE seed data for the
 * prototype — they are not verified facts. Every record is flagged `isSeed`
 * and the UI labels the dataset as demo data. Nothing here should be treated
 * as a verified claim about a real event.
 *
 * The set is intentionally varied — verticals, regions, months, tiers, scoring
 * profiles and evidence confidence — including one record with genuinely missing
 * evidence, so that filtering, sorting and normalization are meaningful.
 *
 * Each dimension carries `signals` (short, scannable sales cues shown in the UI)
 * and `evidence` (longer reasoning, kept for transparency). Signals are condensed
 * from the same evidence — they never introduce new claims.
 */
export const SEED_CONFERENCES: Conference[] = [
  {
    id: 'money2020-usa',
    name: 'Money20/20 USA',
    startDate: '2026-10-25',
    endDate: '2026-10-28',
    city: 'Las Vegas',
    country: 'United States',
    region: 'North America',
    vertical: 'Payments',
    audienceSize: 11500,
    url: 'https://us.money2020.com',
    description:
      "The largest gathering of the global payments and fintech industry. Exhibitors span PSPs, card networks, cross-border platforms and multi-currency providers, with a heavy concentration of commercial decision-makers.",
    status: 'approved',
    source: 'Official site — Who Attends, Sponsors, Agenda',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 100,
        signals: ['PSPs', 'Card networks', 'Cross-border platforms', 'Multi-currency providers'],
        evidence:
          'Exhibitor and sponsor lists are dominated by PSPs, card networks, cross-border payment platforms and multi-currency providers — directly Grain use cases.',
      },
      buyerFit: {
        score: 100,
        signals: ['Heads of Payments', 'VP Finance', 'Treasury leaders', 'Fintech C-suite'],
        evidence:
          'Dense concentration of Heads of Payments, VP Finance and treasury leaders; C-suite fintech attendance is a headline of the event.',
      },
      agendaRelevance: {
        score: 75,
        signals: ['Cross-border payments', 'FX', 'Money movement'],
        evidence:
          'Several tracks cover cross-border payments, FX and money movement, though the agenda also spans lending, crypto and identity.',
      },
      networking: {
        score: 100,
        signals: ['1:1 matchmaking', 'Meetings platform', 'Hosted programs', 'Receptions'],
        evidence:
          'Structured matchmaking, a dedicated meetings platform, hosted programs and extensive evening receptions.',
      },
    },
  },
  {
    id: 'money2020-europe',
    name: 'Money20/20 Europe',
    startDate: '2027-06-08',
    endDate: '2027-06-10',
    city: 'Amsterdam',
    country: 'Netherlands',
    region: 'Europe',
    vertical: 'Payments',
    audienceSize: 8000,
    url: 'https://europe.money2020.com',
    description:
      "Europe's flagship payments and fintech show. A strong European concentration of PSPs, cross-border and multi-currency platforms alongside the commercial leaders who buy for them.",
    status: 'approved',
    source: 'Official site — Who Attends, Sponsors, Agenda',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 100,
        signals: ['European PSPs', 'Cross-border platforms', 'Multi-currency providers'],
        evidence:
          'European PSPs, cross-border and multi-currency platforms are heavily represented among exhibitors and sponsors.',
      },
      buyerFit: {
        score: 100,
        signals: ['Payments leadership', 'Finance leaders', 'European fintech execs'],
        evidence:
          'Payments and finance leadership across European fintechs and platforms attend in force.',
      },
      agendaRelevance: {
        score: 75,
        signals: ['Cross-border payments', 'Money movement'],
        evidence:
          'Strong cross-border and money-movement tracks within a broad payments agenda.',
      },
      networking: {
        score: 100,
        signals: ['Meetings platform', '1:1 matchmaking', 'Receptions'],
        evidence: 'Meetings platform, matchmaking and extensive receptions.',
      },
    },
  },
  {
    id: 'sibos-2026',
    name: 'Sibos',
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    city: 'Frankfurt',
    country: 'Germany',
    region: 'Europe',
    vertical: 'Payments',
    audienceSize: 11000,
    url: 'https://www.sibos.com',
    description:
      'Swift-organized global banking and financial infrastructure event. Cross-border payments, correspondent banking and FX are central themes, with a treasury- and banking-heavy audience.',
    status: 'approved',
    source: 'Official site — Programme, Delegate profile',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Global banks', 'Market infrastructures', 'Large corporates'],
        evidence:
          'Global banks, market infrastructures and large corporates dominate. FX/cross-border relevance is high, but the audience skews to banking institutions over the mid-market platforms Grain often serves.',
      },
      buyerFit: {
        score: 100,
        signals: ['Treasury leaders', 'Correspondent banking', 'Payments heads'],
        evidence:
          'Dense concentration of treasury, correspondent-banking and payments leadership.',
      },
      agendaRelevance: {
        score: 100,
        signals: ['Cross-border payments', 'FX', 'Correspondent banking'],
        evidence:
          'Cross-border payments, FX and correspondent banking are core themes of the programme.',
      },
      networking: {
        score: 75,
        signals: ['Community sessions', 'Meeting spaces', 'Stand meetings'],
        evidence:
          'Structured community sessions, meeting spaces and stand-based meetings, with less 1:1 matchmaking than commercial fintech shows.',
      },
    },
  },
  {
    id: 'eurofinance-itm',
    name: 'EuroFinance International Treasury Management',
    startDate: '2026-10-07',
    endDate: '2026-10-09',
    city: 'Barcelona',
    country: 'Spain',
    region: 'Europe',
    vertical: 'Treasury & Finance',
    audienceSize: 2500,
    url: 'https://www.eurofinance.com',
    description:
      "Europe's leading corporate treasury conference. The audience is overwhelmingly treasurers and CFOs from multinationals managing real FX exposure.",
    status: 'approved',
    source: 'Official site — Who Attends, Agenda',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Corporate treasuries', 'Multinationals', 'Real FX exposure'],
        evidence:
          'Attendees are corporate treasurers from large multinationals with genuine FX exposure — strong fit, though skewed to enterprise corporates rather than payment platforms.',
      },
      buyerFit: {
        score: 100,
        signals: ['Treasurers', 'Heads of Treasury', 'CFOs'],
        evidence:
          'The audience is overwhelmingly Treasurers, Heads of Treasury and CFOs — Grain’s primary buyers.',
      },
      agendaRelevance: {
        score: 100,
        signals: ['FX risk', 'Currency management', 'Cross-border cash'],
        evidence: 'FX risk, currency management and cross-border cash are core agenda themes.',
      },
      networking: {
        score: 75,
        signals: ['Meetings app', 'Structured networking', 'Receptions'],
        evidence: 'Structured networking, a meetings app and evening receptions.',
      },
    },
  },
  {
    id: 'afp-annual',
    name: 'AFP Annual Conference',
    startDate: '2026-10-18',
    endDate: '2026-10-21',
    city: 'San Diego',
    country: 'United States',
    region: 'North America',
    vertical: 'Treasury & Finance',
    audienceSize: 6000,
    url: 'https://www.afponline.org',
    description:
      'The Association for Financial Professionals’ flagship US event for corporate treasury and finance teams, with dedicated FX and international treasury content.',
    status: 'approved',
    source: 'Official site — Attendee profile, Sessions',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['US corporate treasury', 'Large enterprises', 'Finance teams'],
        evidence:
          'Corporate treasury and finance teams from large US enterprises. Strong buyer fit; company profile skews domestic, so cross-border exposure varies by attendee.',
      },
      buyerFit: {
        score: 100,
        signals: ['Treasurers', 'Assistant Treasurers', 'FP&A leaders'],
        evidence:
          'Treasurers, Assistant Treasurers and FP&A leaders make up the core audience.',
      },
      agendaRelevance: {
        score: 75,
        signals: ['FX sessions', 'International treasury'],
        evidence:
          'Dedicated FX and international-treasury sessions within a broad treasury/finance agenda.',
      },
      networking: {
        score: 75,
        signals: ['Roundtables', 'Structured networking', 'Large expo'],
        evidence: 'Structured networking, roundtables and a large expo floor.',
      },
    },
  },
  {
    id: 'mpe-berlin',
    name: 'Merchant Payments Ecosystem (MPE)',
    startDate: '2027-03-16',
    endDate: '2027-03-18',
    city: 'Berlin',
    country: 'Germany',
    region: 'Europe',
    vertical: 'Payments',
    audienceSize: 1500,
    url: 'https://www.merchantpaymentsecosystem.com',
    description:
      'A focused merchant-payments event bringing together PSPs, acquirers and cross-border payment specialists around acquiring, FX and payment optimization.',
    status: 'approved',
    source: 'Official site — Attendees, Agenda',
    evidenceConfidence: 'high',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 100,
        signals: ['PSPs', 'Acquirers', 'Cross-border specialists'],
        evidence:
          'A tightly focused merchant-payments audience: PSPs, acquirers and cross-border payment specialists.',
      },
      buyerFit: {
        score: 75,
        signals: ['Payments leaders', 'Merchant payments teams'],
        evidence:
          'Strong payments-leadership presence, with fewer pure treasury/CFO buyers.',
      },
      agendaRelevance: {
        score: 100,
        signals: ['Cross-border acquiring', 'FX', 'Payment optimization'],
        evidence:
          'Cross-border acquiring, FX and payment optimization are central agenda themes.',
      },
      networking: {
        score: 75,
        signals: ['1:1 meetings', 'Focused networking'],
        evidence: 'Structured 1:1 meetings and focused networking across a compact event.',
      },
    },
  },
  {
    id: 'singapore-fintech-festival',
    name: 'Singapore FinTech Festival',
    startDate: '2026-11-11',
    endDate: '2026-11-13',
    city: 'Singapore',
    country: 'Singapore',
    region: 'Asia-Pacific',
    vertical: 'Fintech',
    audienceSize: 60000,
    url: 'https://www.fintechfestival.sg',
    description:
      "One of the world's largest fintech gatherings. Enormous reach including many cross-border and multi-currency players, diluted by a very broad fintech, policy and investor crowd.",
    status: 'approved',
    source: 'Official site — Overview, Programme',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Cross-border players', 'Multi-currency fintechs', 'Broad fintech crowd'],
        evidence:
          'Huge fintech audience including many cross-border payment and multi-currency players, though diluted by a very broad fintech and policy crowd.',
      },
      buyerFit: {
        score: 75,
        signals: ['Payments decision-makers', 'Finance leaders', 'Regulators & investors'],
        evidence:
          'Strong presence of payments and finance decision-makers alongside regulators, investors and technologists.',
      },
      agendaRelevance: {
        score: 50,
        signals: ['Cross-border payments', 'Broad: AI, policy, crypto'],
        evidence:
          'Cross-border payments feature, but within a sprawling agenda spanning AI, policy, crypto and inclusion.',
      },
      networking: {
        score: 100,
        signals: ['Matchmaking platform', 'Investor programs', 'Hosted sessions'],
        evidence:
          'Dedicated matchmaking platform, investor and hosted programs, and extensive structured networking.',
      },
    },
  },
  {
    id: 'seamless-middle-east',
    name: 'Seamless Middle East',
    startDate: '2027-05-12',
    endDate: '2027-05-13',
    city: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East',
    vertical: 'Payments',
    audienceSize: 20000,
    url: 'https://seamless-middle-east.com',
    description:
      'A large payments, fintech, e-commerce and retail event for the MENA region, with real cross-border flows but a broad, mixed audience.',
    status: 'approved',
    source: 'Official site — Visitor profile, Agenda',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Payments & e-commerce', 'MENA cross-border flows', 'Retail vendors'],
        evidence:
          'Large payments and e-commerce audience with genuine cross-border flows across MENA, mixed with retail and identity vendors.',
      },
      buyerFit: {
        score: 50,
        signals: ['Senior payments leaders', 'E-commerce leaders', 'Mixed seniority'],
        evidence:
          'Senior payments and e-commerce leaders attend, but the crowd is broad and includes many technical and mid-level roles.',
      },
      agendaRelevance: {
        score: 50,
        signals: ['Cross-border payments', 'Broad payments & retail'],
        evidence:
          'Cross-border payments appears as a theme within a wide payments/retail/e-commerce program.',
      },
      networking: {
        score: 75,
        signals: ['Meetings program', 'Large exhibition'],
        evidence: 'Structured networking, a meetings program and a large exhibition floor.',
      },
    },
  },
  {
    id: 'phocuswright',
    name: 'The Phocuswright Conference',
    startDate: '2026-11-16',
    endDate: '2026-11-19',
    city: 'Fort Lauderdale',
    country: 'United States',
    region: 'North America',
    vertical: 'Travel',
    audienceSize: 2000,
    url: 'https://www.phocuswright.com',
    description:
      'The leading travel-industry conference. Travel platforms, OTAs and wholesalers carry material cross-border and multi-currency exposure, viewed through a travel-commerce lens.',
    status: 'approved',
    source: 'Official site — Attendees, Agenda',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Travel platforms', 'OTAs', 'Wholesalers', 'Cross-border FX exposure'],
        evidence:
          'Travel platforms, OTAs and wholesalers with material cross-border and multi-currency exposure, viewed broadly through travel commerce.',
      },
      buyerFit: {
        score: 50,
        signals: ['Travel executives', 'Product leaders', 'Few finance buyers'],
        evidence:
          'Senior travel executives and product leaders attend; finance/treasury buyers are present but not the primary audience.',
      },
      agendaRelevance: {
        score: 50,
        signals: ['Travel payments', 'FX in distribution sessions'],
        evidence:
          'Payments and FX surface within travel-distribution and fintech sessions, not as a core theme.',
      },
      networking: {
        score: 75,
        signals: ['Structured meetings', 'Hosted sessions', 'Receptions'],
        evidence: 'Structured meetings, hosted sessions and receptions.',
      },
    },
  },
  {
    id: 'shoptalk-europe',
    name: 'Shoptalk Europe',
    startDate: '2027-06-02',
    endDate: '2027-06-04',
    city: 'Barcelona',
    country: 'Spain',
    region: 'Europe',
    vertical: 'E-commerce & Marketplaces',
    audienceSize: 4000,
    url: 'https://shoptalk.com/europe',
    description:
      'A major retail and e-commerce event. Global marketplaces and cross-border retailers attend, but the audience is predominantly commercial and merchandising rather than finance.',
    status: 'approved',
    source: 'Official site — Who Attends, Meetup program',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Global marketplaces', 'Cross-border retailers', 'Broad retail crowd'],
        evidence:
          'Global marketplaces and cross-border retailers with international money flows, mixed with a broad retail and brand audience.',
      },
      buyerFit: {
        score: 25,
        signals: ['Commercial & merchandising', 'Product leaders', 'Few finance buyers'],
        evidence:
          'Commercial, merchandising and product leaders dominate; finance and payments buyers are rare.',
      },
      agendaRelevance: {
        score: 25,
        signals: ['Retail & commerce focus', 'Payments peripheral'],
        evidence:
          'International payments appear only peripherally within a retail and commerce agenda.',
      },
      networking: {
        score: 100,
        signals: ['Hosted-meetings program', 'Algorithmic 1:1 matchmaking'],
        evidence:
          'Signature hosted-meetings program with algorithmic 1:1 matchmaking.',
      },
    },
  },
  {
    id: 'web-summit',
    name: 'Web Summit',
    startDate: '2026-11-02',
    endDate: '2026-11-05',
    city: 'Lisbon',
    country: 'Portugal',
    region: 'Europe',
    vertical: 'Technology & SaaS',
    audienceSize: 70000,
    url: 'https://websummit.com',
    description:
      'A vast general technology conference. Relevant companies attend, but as a small slice of an enormous cross-sector startup and tech audience.',
    status: 'approved',
    source: 'Official site — Attendee profile',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 50,
        signals: ['Some relevant firms', 'Vast general tech audience'],
        evidence:
          'Relevant companies attend but form a small slice of an enormous, general technology and startup audience.',
      },
      buyerFit: {
        score: 50,
        signals: ['Cross-sector execs', 'Founders', 'Diluted buyer mix'],
        evidence:
          'Executives and founders across every sector; Grain’s specific buyers are heavily diluted.',
      },
      agendaRelevance: {
        score: 25,
        signals: ['Broad tech agenda', 'FX/payments peripheral'],
        evidence: 'FX and cross-border payments are peripheral within a broad tech agenda.',
      },
      networking: {
        score: 100,
        signals: ['App-based matchmaking', 'Investor programs', 'Networking at scale'],
        evidence:
          'Dedicated app-based matchmaking, investor programs and structured networking at scale.',
      },
    },
  },
  {
    id: 'fintech-connect-london',
    name: 'FinTech Connect',
    startDate: '2026-12-02',
    endDate: '2026-12-03',
    city: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    vertical: 'Fintech',
    audienceSize: 3000,
    url: 'https://www.fintechconnect.com',
    description:
      'A UK fintech event spanning payments, lending and regtech. Relevant companies are present within a broad fintech audience, without a strong concentration of treasury buyers.',
    status: 'approved',
    source: 'Official site — Attendees, Agenda',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 50,
        signals: ['Banks & fintechs', 'Payment providers', 'Broad fintech crowd'],
        evidence:
          'A mix of banks, fintechs and payment providers; relevant companies present within a broad fintech crowd.',
      },
      buyerFit: {
        score: 50,
        signals: ['Fintech & payments pros', 'Few treasury buyers'],
        evidence:
          'Senior fintech and payments professionals attend, without a strong concentration of treasury/finance buyers.',
      },
      agendaRelevance: {
        score: 50,
        signals: ['Payments & cross-border', 'Lending & regtech too'],
        evidence:
          'Payments and cross-border content sits alongside broader fintech, lending and regtech themes.',
      },
      networking: {
        score: 75,
        signals: ['Partnering tool', 'Structured meetings', 'Networking drinks'],
        evidence: 'Structured meetings, a partnering tool and networking drinks.',
      },
    },
  },
  {
    id: 'qcon-london',
    name: 'QCon London',
    startDate: '2027-04-05',
    endDate: '2027-04-07',
    city: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    vertical: 'Technology & SaaS',
    audienceSize: 1600,
    url: 'https://qconlondon.com',
    description:
      'A senior software-engineering conference focused on architecture and engineering practice. Included to demonstrate a genuinely low-fit event.',
    status: 'approved',
    source: 'Official site — Audience, Tracks',
    evidenceConfidence: 'medium',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 25,
        signals: ['Software-engineering audience', 'Few cross-border use cases'],
        evidence:
          'A software-engineering audience; few attendees map to Grain’s cross-border use cases.',
      },
      buyerFit: {
        score: 25,
        signals: ['Senior engineers', 'Architects', 'Not commercial buyers'],
        evidence:
          'Primarily senior engineers and architects — technical roles, not commercial buyers.',
      },
      agendaRelevance: {
        score: 0,
        signals: ['Architecture & engineering only', 'No FX/payments/treasury content'],
        evidence:
          'The agenda is architecture and engineering practice; no meaningful FX, payments or treasury content.',
      },
      networking: {
        score: 50,
        signals: ['Standard breaks', 'Evening reception', 'Limited structure'],
        evidence: 'Standard breaks and an evening reception; limited structured networking.',
      },
    },
  },
  {
    id: 'latam-fintech-forum',
    name: 'LatAm Fintech Forum',
    startDate: '2027-08-18',
    endDate: '2027-08-19',
    city: 'São Paulo',
    country: 'Brazil',
    region: 'Latin America',
    vertical: 'Fintech',
    audienceSize: null,
    url: 'https://latamfintechforum.example',
    description:
      'An emerging regional fintech forum. Included as a genuine missing-evidence case: promising signals, but the public record is incomplete at time of review.',
    status: 'approved',
    source: 'Limited public information — early announcements only',
    evidenceConfidence: 'low',
    sources: [],
    attendanceStatus: 'undecided',
    isSeed: true,
    addedManually: false,
    dimensions: {
      companyFit: {
        score: 75,
        signals: ['Regional fintechs', 'Cross-border remittance players'],
        evidence:
          'Regional fintech and cross-border remittance players feature among the announced participants.',
      },
      buyerFit: {
        score: null,
        signals: [],
        evidence:
          'Speaker roster and attendee personas were not published at time of review — buyer mix could not be assessed.',
      },
      agendaRelevance: {
        score: 50,
        signals: ['Cross-border payments (announced)', 'Full agenda unavailable'],
        evidence:
          'Cross-border payments appears among announced themes, but a full agenda was not available.',
      },
      networking: {
        score: null,
        signals: [],
        evidence:
          'No networking-format details were published — this dimension could not be assessed.',
      },
    },
  },
];
