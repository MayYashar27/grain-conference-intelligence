import type {
  AttendanceStatus,
  Conference,
  ConferenceStatus,
  DimensionKey,
  DimensionAssessment,
  EvidenceConfidence,
  Region,
  Vertical,
} from '../types/conference';

/** Shape of a row in the `conferences` table (snake_case, as Postgres returns). */
export interface ConferenceRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  region: string | null;
  vertical: string | null;
  audience_size: number | null;
  url: string | null;
  description: string;
  status: string;
  attendance_status: string | null;
  source: string | null;
  sources: string[] | null;
  evidence_confidence: string | null;
  dimensions: Record<DimensionKey, DimensionAssessment>;
  is_seed: boolean;
  added_manually: boolean;
}

/** Map a database row into the app's Conference domain type. */
export function rowToConference(row: ConferenceRow): Conference {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    city: row.city,
    country: row.country,
    region: (row.region as Region | null) ?? null,
    vertical: (row.vertical as Vertical | null) ?? null,
    audienceSize: row.audience_size,
    url: row.url,
    description: row.description,
    status: row.status as ConferenceStatus,
    attendanceStatus: (row.attendance_status as AttendanceStatus | null) ?? 'undecided',
    source: row.source,
    sources: Array.isArray(row.sources) ? row.sources : [],
    evidenceConfidence: (row.evidence_confidence as EvidenceConfidence | null) ?? null,
    dimensions: row.dimensions,
    isSeed: row.is_seed,
    addedManually: row.added_manually,
  };
}
