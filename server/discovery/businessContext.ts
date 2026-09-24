/**
 * Grain business context and scoring rubric, injected into the Gemini prompts.
 * Kept concise and factual — this frames *what makes a conference relevant to
 * Grain*, so the model reasons about fit rather than generic "big fintech" size.
 */

export const GRAIN_CONTEXT = `
Grain provides embedded cross-currency and FX risk-management infrastructure for
businesses with cross-border money flows.

High-value company profiles:
- payment service providers (PSPs) and payment processors
- cross-border payment companies
- travel platforms and travel wholesalers
- fintech infrastructure companies
- marketplaces with international money flows
- any business with meaningful multi-currency or FX exposure

Relevant buyer / champion roles:
- Treasury and Head of Treasury
- Finance / CFO / VP Finance
- Payments leaders
- FX / Risk roles
- related financial decision-makers

A conference is valuable when it provides access to these company types and
decision-makers, discusses payments / cross-border commerce / treasury / FX, and/or
offers structured ways to meet those people.

Do NOT assume a conference is relevant just because it is a large technology or
fintech event. Judge fit on real evidence of relevant companies, buyers, agenda
topics and networking.
`.trim();

/**
 * How to CLASSIFY evidence into a dimension score. The key correction: the source
 * material will NOT contain a numeric score — YOU assign one by judging the
 * grounded qualitative evidence against the rubric. Return null ONLY when a
 * dimension has essentially no supporting evidence at all.
 */
export const DIMENSION_GUIDE = `
IMPORTANT — how to score each dimension:
You will NOT find a number in the sources. You must CLASSIFY the qualitative
evidence you gathered against the rubric below and assign exactly one of:
100, 75, 50, 25, 0. Use null ONLY when there is essentially no evidence for that
dimension — never as a default. If you wrote real evidence for a dimension, you
MUST give it a numeric score. Example: evidence "Group Treasurer, Head of
Treasury, CFO, VP Finance attend" is strong Buyer Fit → score 100, not null.

General anchors (apply per dimension): 100 = strong, direct, concentrated
evidence; 75 = clear evidence, high relevance; 50 = moderate or mixed (relevant
but one part of a broader audience/agenda); 25 = weak or peripheral; 0 = evidence
indicates essentially none; null = no evidence to assess at all.

- company_fit (35%): How strongly does evidence show Grain-relevant company types
  attend — PSPs, processors, cross-border payment companies, fintech
  infrastructure, travel platforms/wholesalers, marketplaces with multi-currency
  exposure? 100 = concentrated in these; 50 = present within a broader crowd;
  25 = only incidental.
- buyer_fit (30%): How strongly does evidence show relevant decision-makers attend
  — CFO/Finance, Treasury, Payments, FX/Risk? 100 = these roles dominate;
  50 = present but diluted; 25 = mostly unrelated/technical roles.
- agenda_relevance (20%): How central are cross-border payments, FX, treasury,
  money movement, multi-currency or payment infrastructure to the agenda?
  100 = core theme; 50 = one track among many; 25 = only peripheral mentions.
- networking_opportunity (15%): How strong is the evidence of real networking
  infrastructure — 1:1 matchmaking, hosted buyer meetings, meeting platforms,
  structured sessions? 100 = matchmaking/scheduled meetings; 50 = standard
  receptions/breaks; 25 = little structure. Do NOT infer strong networking just
  because an event is large.

evidence_confidence reflects completeness/quality of evidence, not how confident
you feel: high = solid evidence across most/all dimensions; medium = useful but
incomplete; low = several dimensions thin or unassessable.

FACTUAL METADATA — strict grounding. Do NOT invent or estimate. Provide
start_date, end_date, city, country and official_url ONLY when supported by the
grounded sources. For audience_size, set value ONLY if a source explicitly states
the figure, and put the supporting source statement in audience_size.evidence; if
no source states it, set value to null and evidence to null — never estimate a
round number. Unknown is better than fabricated precision.
`.trim();

export interface DiscoveryFilters {
  region?: string | null;
  vertical?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  keywords?: string | null;
}

/** Human-readable description of the (optional) filters for the search prompt. */
export function describeFilters(f: DiscoveryFilters): string {
  const parts: string[] = [];
  if (f.region) parts.push(`Region: ${f.region}`);
  if (f.vertical) parts.push(`Vertical/theme: ${f.vertical}`);
  if (f.dateFrom) parts.push(`Not before: ${f.dateFrom}`);
  if (f.dateTo) parts.push(`Not after: ${f.dateTo}`);
  if (f.keywords) parts.push(`Keywords / intent: ${f.keywords}`);
  return parts.length ? parts.join('\n') : '(no filters — find the strongest overall matches)';
}
