/**
 * Phase 4B lead-research model. Public-web research (via Gemini grounding) is
 * kept explicitly separate from AI interpretation and from internal relationship
 * analysis. "Insufficient evidence" is a first-class outcome everywhere.
 */
export type FitLevel = 'high' | 'medium' | 'low' | 'insufficient_evidence';
export type Maturity = 'strong' | 'some' | 'manual_legacy' | 'insufficient_evidence';
export type SalesMotion =
  | 'education_discovery'
  | 'transformation'
  | 'optimization'
  | 'differentiation_replacement'
  | 'expansion_complement'
  | 'insufficient_evidence';
export type LinkedInStatus = 'confident' | 'not_confidently_identified';
export type StackRelation =
  | 'competitor_overlapping'
  | 'adjacent_complementary'
  | 'general_fintech'
  | 'unclear';

/** Deterministic — from internal interaction history only. */
export type RelationshipStage = 'new' | 'engaged' | 'evaluating' | 'stalled';
export type Momentum = 'positive' | 'neutral' | 'negative' | 'insufficient_evidence';

export interface ResearchSource {
  url: string;
  title: string | null;
}

export interface PersonEnrichment {
  title: string | null;
  linkedinUrl: string | null;
  linkedinStatus: LinkedInStatus;
  context: string | null;
}

export interface CompanyEnrichment {
  website: string | null;
  whatItDoes: string | null;
  category: string | null;
  markets: string | null;
}

export interface EvidencedItem {
  label: string;
  evidence: string;
  source: string | null;
}

export interface StackItem {
  name: string;
  usedFor: string | null;
  relation: StackRelation;
  source: string | null;
}

export interface RelationshipAssessment {
  stage: RelationshipStage;
  momentum: Momentum;
  explanation: string;
}

/** The full persisted research payload for a contact. */
export interface LeadResearch {
  researchedAt: string;
  person: PersonEnrichment;
  company: CompanyEnrichment;
  grainSignals: EvidencedItem[];
  financialTechMaturity: { level: Maturity; explanation: string };
  existingStack: StackItem[];
  buyingSignals: EvidencedItem[];
  icpFit: { level: FitLevel; explanation: string };
  relationship: RelationshipAssessment;
  salesMotion: { type: SalesMotion; explanation: string };
  suggestedNextStep: string | null;
  sources: ResearchSource[];
}
