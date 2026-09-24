/**
 * Assembles the GROUNDED context for a follow-up email draft — pure and
 * node-testable. Only facts we actually have are included; nothing is invented.
 * The server feeds these facts to the model with strict "do not fabricate" rules,
 * so the guardrail (what the model is allowed to know) is deterministic and testable.
 */
import type { LeadResearch, RelationshipAssessment } from '../types/research.js';

export interface DraftInteraction {
  note: string | null;
  conferenceName: string | null;
  occurredAt: string;
}

export interface DraftContextInput {
  fullName: string;
  company: string;
  research: LeadResearch | null;
  relationship: RelationshipAssessment;
  interactions: DraftInteraction[];
}

export interface DraftContext {
  /** Grounded facts, safe to hand to the model. */
  facts: string[];
  /** True when we have substantive context (company/tools/notes), not just identity. */
  hasRichContext: boolean;
}

function formatList(names: string[]): string {
  const xs = names.filter(Boolean);
  if (xs.length <= 1) return xs[0] ?? '';
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function buildDraftContext(input: DraftContextInput): DraftContext {
  const { fullName, company, research, relationship, interactions } = input;
  const facts: string[] = [];

  const role = research?.person.title ?? null;
  facts.push(`Recipient: ${fullName}${role ? `, ${role},` : ''} at ${company}.`);

  if (research?.company.whatItDoes) {
    facts.push(`Company context: ${research.company.whatItDoes}`);
  }

  const stack = (research?.existingStack ?? []).map((s) => s.name).filter(Boolean);
  if (stack.length) {
    facts.push(`Financial/payment tools they appear to already use: ${formatList(stack.slice(0, 3))}.`);
  }

  const confs = [...new Set(interactions.map((i) => i.conferenceName).filter((n): n is string => !!n))];
  if (confs.length) facts.push(`Conference context: ${formatList(confs)}.`);

  const dated = interactions.filter((i) => i.occurredAt).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latestNote = dated.length ? (dated[dated.length - 1].note ?? '').trim() : '';
  if (latestNote) facts.push(`Most recent note logged by the salesperson: "${latestNote}"`);

  facts.push(`Relationship so far: stage "${relationship.stage}", momentum "${relationship.momentum}".`);

  const hasRichContext = !!(research?.company.whatItDoes || stack.length || latestNote);
  return { facts, hasRichContext };
}
