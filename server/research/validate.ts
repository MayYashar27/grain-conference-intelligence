/**
 * Deterministic validation of raw Gemini research. Enforces the evidence-first
 * rules the prompt asks for, so a hallucination or an under-evidenced claim is
 * downgraded rather than shown as fact:
 *  - LinkedIn is kept ONLY when confidently identified AND a real linkedin.com URL
 *  - "manual/legacy" maturity requires actual explanation evidence, else insufficient
 *  - all sources / stack / signal URLs must be real (no example placeholders)
 *  - generic or empty "next step" becomes null (no filler advice)
 * Pure (type-only imports) — unit-testable without the API.
 */
import type {
  LeadResearch,
  FitLevel,
  Maturity,
  SalesMotion,
  StackRelation,
  EvidencedItem,
  StackItem,
  ResearchSource,
} from '../../src/types/research.js';
import type { RawResearch } from './schema.js';

export type PublicResearch = Omit<LeadResearch, 'relationship' | 'researchedAt'>;

function isValidUrl(u: unknown): u is string {
  if (typeof u !== 'string' || !/^https?:\/\/.+\..+/i.test(u)) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    // Reject RFC 2606 reserved placeholder domains.
    if (/(^|\.)example\.(com|org|net)$/.test(host) || /\.example$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
function cleanUrl(u: unknown): string | null {
  return isValidUrl(u) ? (u as string).trim().slice(0, 500) : null;
}
function isLinkedInProfile(u: string): boolean {
  return /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\//i.test(u);
}
function str(v: unknown, max = 600): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const FIT: FitLevel[] = ['high', 'medium', 'low', 'insufficient_evidence'];
const MATURITY: Maturity[] = ['strong', 'some', 'manual_legacy', 'insufficient_evidence'];
const MOTION: SalesMotion[] = [
  'education_discovery',
  'transformation',
  'optimization',
  'differentiation_replacement',
  'expansion_complement',
  'insufficient_evidence',
];
const RELATION: StackRelation[] = [
  'competitor_overlapping',
  'adjacent_complementary',
  'general_fintech',
  'unclear',
];
const GENERIC_NEXT_STEP =
  /^(reach out|follow up to learn|learn more|get in touch|connect with|touch base|schedule a call to learn)/i;

// Public claims must be source-traceable: drop items without a valid source URL.
function evidencedList(raw: unknown): EvidencedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const label = str((r as RawResearch['grain_signals'][number])?.label, 80);
      const evidence = str((r as RawResearch['grain_signals'][number])?.evidence, 400);
      const source = cleanUrl((r as { source?: unknown }).source);
      if (!label || !evidence || !source) return null;
      const item: EvidencedItem = { label, evidence, source };
      return item;
    })
    .filter((x): x is EvidencedItem => x !== null)
    .slice(0, 8);
}

export function validatePublicResearch(raw: RawResearch): PublicResearch {
  // ── Person (LinkedIn only when confident + a real profile URL) ──────────────
  const rawLinkedIn = cleanUrl(raw.person?.linkedin_url);
  const linkedinConfident =
    raw.person?.linkedin_status === 'confident' && !!rawLinkedIn && isLinkedInProfile(rawLinkedIn);
  const person = {
    title: str(raw.person?.title, 160),
    linkedinUrl: linkedinConfident ? rawLinkedIn : null,
    linkedinStatus: linkedinConfident ? ('confident' as const) : ('not_confidently_identified' as const),
    context: str(raw.person?.context, 400),
  };

  // ── Company ─────────────────────────────────────────────────────────────────
  const company = {
    website: cleanUrl(raw.company?.website),
    whatItDoes: str(raw.company?.what_it_does, 500),
    category: str(raw.company?.category, 160),
    markets: str(raw.company?.markets, 200),
  };

  // ── Existing stack ──────────────────────────────────────────────────────────
  const existingStack: StackItem[] = (Array.isArray(raw.existing_stack) ? raw.existing_stack : [])
    .map((s) => {
      const name = str(s?.name, 80);
      const source = cleanUrl(s?.source);
      // A named vendor is a public claim: require a source, else drop (no unsourced vendors).
      if (!name || !source) return null;
      const item: StackItem = {
        name,
        usedFor: str(s?.used_for, 200),
        relation: oneOf(s?.relation, RELATION, 'unclear'),
        source,
      };
      return item;
    })
    .filter((x): x is StackItem => x !== null)
    .slice(0, 10);

  // ── Financial-tech maturity (legacy requires real evidence) ─────────────────
  let maturityLevel = oneOf(raw.financial_tech_maturity?.level, MATURITY, 'insufficient_evidence');
  const maturityExplanation = str(raw.financial_tech_maturity?.explanation, 500) ?? '';
  if (maturityLevel === 'manual_legacy' && maturityExplanation.replace(/[^a-z0-9]/gi, '').length < 20) {
    maturityLevel = 'insufficient_evidence';
  }

  // ── ICP fit / sales motion ──────────────────────────────────────────────────
  const icpFit = {
    level: oneOf(raw.icp_fit?.level, FIT, 'insufficient_evidence'),
    explanation: str(raw.icp_fit?.explanation, 500) ?? 'Insufficient public evidence to assess ICP fit.',
  };
  const salesMotion = {
    type: oneOf(raw.sales_motion?.type, MOTION, 'insufficient_evidence'),
    explanation: str(raw.sales_motion?.explanation, 500) ?? '',
  };

  // ── Suggested next step (no generic filler) ─────────────────────────────────
  let suggestedNextStep = str(raw.suggested_next_step, 600);
  if (suggestedNextStep && (suggestedNextStep.length < 20 || GENERIC_NEXT_STEP.test(suggestedNextStep))) {
    suggestedNextStep = null;
  }

  // ── Sources (real URLs, deduped) ────────────────────────────────────────────
  const seen = new Set<string>();
  const sources: ResearchSource[] = (Array.isArray(raw.sources) ? raw.sources : [])
    .map((s) => {
      const url = cleanUrl(s?.url);
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return { url, title: str(s?.title, 160) };
    })
    .filter((x): x is ResearchSource => x !== null)
    .slice(0, 12);

  return {
    person,
    company,
    grainSignals: evidencedList(raw.grain_signals),
    financialTechMaturity: { level: maturityLevel, explanation: maturityExplanation || 'Insufficient evidence.' },
    existingStack,
    buyingSignals: evidencedList(raw.buying_signals),
    icpFit,
    salesMotion,
    suggestedNextStep,
    sources,
  };
}
