/**
 * Turns the internal research + relationship data into a concise, sales-facing
 * brief and a single recommended next step — in natural language, with NO AI
 * taxonomy exposed (no "Maturity: HIGH", no "Vendor: Adjacent") and NO reasoning
 * chain. It is a deterministic TRANSLATION of already-computed fields, composed
 * client-side, so it costs nothing and never triggers a Gemini call on load.
 *
 * The heavier structured research fields stay in LeadResearch for internal use;
 * here we only surface useful conclusions. Pure and node-testable.
 */
import type { LeadResearch, RelationshipAssessment } from '../types/research';

export interface BriefInput {
  research: LeadResearch | null;
  relationship: RelationshipAssessment;
  fullName: string;
  company: string;
}

export interface BriefParagraph {
  /** Sales copy. May contain **bold** spans for important names/conclusions. */
  text: string;
  /** The Sales angle paragraph — given a subtle emphasis in the UI. */
  emphasis?: boolean;
}

export interface LeadBrief {
  /** A few naturally-separated paragraphs — rich, but scannable in ~10s. */
  paragraphs: BriefParagraph[];
  /** Always actionable; never generic "reach out to learn more". */
  nextStep: string;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

function ensureSentence(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function formatList(names: string[]): string {
  const xs = names.filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

function relationshipSentence(rel: RelationshipAssessment): string | null {
  switch (rel.momentum) {
    case 'positive':
      return 'The latest interaction showed concrete interest, indicating **positive momentum**.';
    case 'negative':
      return 'Recent signals are negative — treat this as **re-engagement**, not an active opportunity.';
    case 'neutral':
      return "The relationship is active but hasn't shown a strong buying signal yet — **neutral momentum**.";
    default:
      return null; // insufficient_evidence → say nothing rather than filler
  }
}

/**
 * A concise "what it's used for" phrase from a provider's usedFor text — keeps the
 * grounded product context but stays readable inside a flowing sentence.
 */
function techPurpose(usedFor: string | null): string | null {
  if (!usedFor) return null;
  const clean = usedFor.trim().replace(/\.+$/, '');
  const m = clean.match(/\b(for|to)\s+(.+)/i);
  let phrase = m ? `${m[1].toLowerCase()} ${m[2].trim()}` : null;
  if (!phrase) return null;
  if (phrase.length > 90) phrase = phrase.slice(0, phrase.slice(0, 90).lastIndexOf(' '));
  return phrase;
}

/** Rich, grounded financial-stack sentence with bolded providers. Null if no evidence. */
function stackSentence(research: LeadResearch): string | null {
  const items = research.existingStack.filter((s) => s.name).slice(0, 4);
  if (items.length === 0) return null;
  const parts = items.map((s) => {
    const purpose = techPurpose(s.usedFor);
    return purpose ? `**${s.name}** ${purpose}` : `**${s.name}**`;
  });
  return `The company uses ${formatList(parts)}.`;
}

/** Why the person's role matters — grounded in the confident role only. */
function whyMatters(research: LeadResearch, first: string, company: string): string | null {
  if (!research.person.title) return null;
  return `**${first} is ${research.person.title}** — directly relevant to how ${company} handles payments and cross-border money movement.`;
}

/** The most actionable, grounded recommendation, prefixed "Sales angle:". */
function salesAngle(research: LeadResearch | null, company: string, relationship: RelationshipAssessment): string {
  let body: string;
  if (research && (research.existingStack.some((s) => s.name) || research.financialTechMaturity.level === 'strong')) {
    body = `${company} already has sophisticated financial infrastructure, so position Grain as a **complement or improvement** to the existing setup rather than introducing the category from scratch.`;
  } else if (research?.financialTechMaturity.level === 'manual_legacy') {
    body = `Signs of manual / legacy processes — lead with **modernizing** their cross-border payments and FX.`;
  } else {
    body = recommendedNextStep(research, relationship);
  }
  return `**Sales angle:** ${body}`;
}

/** Compose the sales brief as scannable paragraphs + a grounded next step. */
export function composeLeadBrief(input: BriefInput): LeadBrief {
  const { research, relationship, fullName, company } = input;
  const paragraphs: BriefParagraph[] = [];

  if (research) {
    // Company — what they do.
    if (research.company.whatItDoes) {
      paragraphs.push({ text: ensureSentence(research.company.whatItDoes) });
    }
    // Existing financial technology — rich + grounded, ONLY when there's evidence.
    const stack = stackSentence(research);
    if (stack) paragraphs.push({ text: stack });
    // Why this person matters — role relevance.
    const why = whyMatters(research, firstName(fullName), company);
    if (why) paragraphs.push({ text: why });
  }

  // Sales angle — actionable, grounded, subtly emphasized.
  paragraphs.push({ text: salesAngle(research, company, relationship), emphasis: true });

  // Relationship — interpretation of the interaction history.
  const rel = relationshipSentence(relationship);
  if (rel) paragraphs.push({ text: rel });

  return {
    paragraphs,
    nextStep: recommendedNextStep(research, relationship),
  };
}

/** A single, concrete next action. Prefers the researched step; else derives one. */
export function recommendedNextStep(
  research: LeadResearch | null,
  relationship: RelationshipAssessment,
): string {
  if (research?.suggestedNextStep) return research.suggestedNextStep;

  if (relationship.momentum === 'negative' || relationship.stage === 'stalled') {
    return 'Re-establish contact and confirm whether priorities have changed before investing more time.';
  }
  if (relationship.momentum === 'positive' || relationship.stage === 'evaluating') {
    return 'Follow up on the interest from your last conversation with a focused next step, such as a tailored demo.';
  }
  if (relationship.stage === 'new' || relationship.momentum === 'insufficient_evidence') {
    return 'Gather more context in the next conversation before recommending a specific solution angle.';
  }
  return 'Book a follow-up to uncover a concrete need before proposing a specific solution.';
}
