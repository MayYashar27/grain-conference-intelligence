/**
 * Core domain model for the Conference Intelligence tool.
 *
 * The model is intentionally structured so later phases (discovery inbox,
 * yearly planning, trip clustering, lead capture, CRM sync) can attach to it
 * without a redesign. Fields that belong to future layers are noted but not
 * yet populated in Phase 1.
 */

/** Weighted scoring dimensions. Keys are stable; labels/weights live in scoring.ts. */
export type DimensionKey =
  | 'companyFit'
  | 'buyerFit'
  | 'agendaRelevance'
  | 'networking';

/**
 * Discrete rubric values, matching the scoring model (0/25/50/75/100).
 * `null` means "Unknown / Insufficient Evidence" — deliberately distinct from 0,
 * which means "evidence shows poor fit".
 */
export type DimensionScoreValue = 0 | 25 | 50 | 75 | 100;

export interface DimensionAssessment {
  /** null => Insufficient Evidence; excluded from the weighted score. */
  score: DimensionScoreValue | null;
  /**
   * Short, scannable sales signals drawn from this conference's public evidence
   * (e.g. "PSPs", "Heads of Payments"). These are what the salesperson reads.
   */
  signals: string[];
  /**
   * Longer-form reasoning behind the score. Retained in the data model for
   * transparency, but presented subtly rather than in the main hierarchy.
   */
  evidence: string;
}

/** Lifecycle status. Phase 1 works with `approved`; the others power future discovery. */
export type ConferenceStatus = 'discovered' | 'approved' | 'dismissed';

/**
 * Planning attendance — separate from Fit/Tier. Fit answers "how relevant?",
 * attendance answers "are we planning to go?". Deliberately not "I will attend"
 * so the model stays compatible with a future team/rep-assignment feature.
 */
export type AttendanceStatus = 'undecided' | 'attending' | 'not_attending';

/** Completeness/quality of the public evidence behind the score — not the score itself. */
export type EvidenceConfidence = 'high' | 'medium' | 'low';

export type Tier = 'A' | 'B' | 'C' | 'D';

export type Region =
  | 'North America'
  | 'Europe'
  | 'Middle East'
  | 'Asia-Pacific'
  | 'Latin America'
  | 'Africa';

export type Vertical =
  | 'Payments'
  | 'Fintech'
  | 'Treasury & Finance'
  | 'Travel'
  | 'E-commerce & Marketplaces'
  | 'Technology & SaaS';

export interface Conference {
  id: string;
  name: string;
  /** ISO date strings (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  /** null => "Not specified" — kept as genuinely missing, not a classification. */
  region: Region | null;
  vertical: Vertical | null;
  /** Estimated audience size when publicly known; null when unknown. */
  audienceSize: number | null;
  /** Official conference URL. */
  url: string | null;
  description: string;
  status: ConferenceStatus;
  /** Planning attendance; defaults to 'undecided'. Independent of Fit/Tier. */
  attendanceStatus: AttendanceStatus;
  /** Where the scoring evidence was drawn from (e.g. "Official site — Who Attends, Sponsors"). */
  source: string | null;
  /** Public-web source URLs backing the record (from AI discovery grounding). */
  sources: string[];
  /** null => not yet assessed (e.g. a manually added, unscored conference). */
  evidenceConfidence: EvidenceConfidence | null;
  dimensions: Record<DimensionKey, DimensionAssessment>;
  /** True for demo/seed records whose factual details are illustrative, not verified. */
  isSeed: boolean;
  /** True when a user added the conference manually via the app. */
  addedManually: boolean;
}
